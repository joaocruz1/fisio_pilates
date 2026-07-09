"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/server/actions/result";
import { requireTenant } from "@/server/auth";
import { ingerirFonteKb } from "@/server/services/kb-ingest-fonte";
import {
  ALLOWED_KB_MIMES,
  KB_SOURCES_BUCKET,
  MAX_KB_BYTES,
  pathKbArquivo,
} from "@/server/services/storage";

type UploadKbInput = { fileName: string; mimeType: string; sizeBytes: number };

/** source_type simples a partir do mime, para exibição e ingestão. */
function tipoDoMime(mime: string): string {
  if (mime === "application/pdf") return "pdf";
  if (mime === "text/plain") return "txt";
  if (mime.startsWith("image/")) return "image";
  if (mime.includes("wordprocessingml")) return "docx";
  return "arquivo";
}

/** Passo 1: signed upload URL para o material da base (PDF, Word, texto ou imagem). */
export async function criarUrlUploadKb(
  input: UploadKbInput,
): Promise<ActionResult<{ path: string; token: string; docId: string }>> {
  const ctx = await requireTenant();
  if (!(ALLOWED_KB_MIMES as readonly string[]).includes(input.mimeType)) {
    return { ok: false, erro: "Formato não aceito. Use PDF, Word, texto ou imagem." };
  }
  if (input.sizeBytes <= 0 || input.sizeBytes > MAX_KB_BYTES) {
    return { ok: false, erro: "Arquivo muito grande (máximo 100 MB)." };
  }

  const docId = crypto.randomUUID();
  const path = pathKbArquivo(ctx.tenant.id, docId, input.mimeType);
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(KB_SOURCES_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) return { ok: false, erro: "Não foi possível iniciar o envio." };
  return { ok: true, data: { path: data.path, token: data.token, docId } };
}

/** Passo 2: cria o kb_document e processa a ingestão (síncrona, multi-formato). */
export async function confirmarUploadKb(input: {
  docId: string;
  storagePath: string;
  title: string;
  mimeType: string;
  licenseOk: boolean;
}): Promise<ActionResult> {
  const ctx = await requireTenant();
  if (!input.title.trim()) return { ok: false, erro: "Informe o título do material." };
  if (!input.licenseOk) {
    return { ok: false, erro: "Confirme que você possui o material legalmente." };
  }
  const supabase = await createClient();

  const { error } = await supabase.from("kb_documents").insert({
    id: input.docId,
    tenant_id: ctx.tenant.id,
    scope: "tenant",
    title: input.title.trim(),
    storage_path: `${KB_SOURCES_BUCKET}/${input.storagePath}`,
    source_type: tipoDoMime(input.mimeType),
    license_note: "Declarado como material de posse legal pela profissional.",
    status: "queued",
    created_by: ctx.user.id,
  });
  if (error) return { ok: false, erro: "Não foi possível registrar o material." };

  const res = await ingerirFonteKb(input.docId);
  revalidatePath("/conhecimento");
  if (!res.ok) {
    return { ok: false, erro: "Material enviado, mas houve falha ao indexar. Tente reprocessar." };
  }
  return { ok: true, data: null };
}

/** Adiciona um LINK à base: baixa o conteúdo da página e indexa. */
export async function adicionarLinkKb(input: {
  url: string;
  title: string;
  licenseOk: boolean;
}): Promise<ActionResult> {
  const ctx = await requireTenant();
  if (!input.licenseOk) {
    return { ok: false, erro: "Confirme que você pode usar este conteúdo legalmente." };
  }
  let url: URL;
  try {
    url = new URL(input.url.trim());
    if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
  } catch {
    return { ok: false, erro: "Informe um link válido (começando com http:// ou https://)." };
  }

  const docId = crypto.randomUUID();
  const supabase = await createClient();
  const { error } = await supabase.from("kb_documents").insert({
    id: docId,
    tenant_id: ctx.tenant.id,
    scope: "tenant",
    title: input.title.trim() || url.hostname,
    // Sem arquivo no Storage: path sintético (source_url guarda a origem real).
    storage_path: `${ctx.tenant.id}/${docId}.url`,
    source_type: "url",
    source_url: url.toString(),
    license_note: "Link declarado de uso legal pela profissional.",
    status: "queued",
    created_by: ctx.user.id,
  });
  if (error) return { ok: false, erro: "Não foi possível registrar o link." };

  const res = await ingerirFonteKb(docId);
  revalidatePath("/conhecimento");
  if (!res.ok) {
    return { ok: false, erro: "Não foi possível ler o conteúdo do link. Verifique a URL." };
  }
  return { ok: true, data: null };
}

/** Reprocessa a ingestão de um material do tenant (síncrono). */
export async function reprocessarKbDocumento(docId: string): Promise<ActionResult> {
  const ctx = await requireTenant();
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("kb_documents")
    .select("id, scope, tenant_id")
    .eq("id", docId)
    .maybeSingle();
  if (doc?.scope !== "tenant" || doc.tenant_id !== ctx.tenant.id) {
    return { ok: false, erro: "Material não encontrado." };
  }

  const res = await ingerirFonteKb(docId);
  revalidatePath("/conhecimento");
  if (!res.ok) return { ok: false, erro: "Falha ao processar o material." };
  return { ok: true, data: null };
}

export async function excluirKbDocumento(docId: string): Promise<ActionResult> {
  await requireTenant();
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("kb_documents")
    .select("storage_path, scope, source_type")
    .eq("id", docId)
    .maybeSingle();
  if (doc?.scope !== "tenant") {
    return { ok: false, erro: "Material não encontrado." };
  }

  // Links não têm objeto no Storage; só arquivos.
  if (doc.source_type !== "url") {
    const objectPath = doc.storage_path.replace(/^kb-sources\//, "");
    await supabase.storage.from(KB_SOURCES_BUCKET).remove([objectPath]);
  }
  // Remove a linha (cascade apaga os chunks).
  const { error } = await supabase.from("kb_documents").delete().eq("id", docId);
  if (error) return { ok: false, erro: "Não foi possível excluir o material." };

  revalidatePath("/conhecimento");
  return { ok: true, data: null };
}
