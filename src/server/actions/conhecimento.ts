"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { env } from "@/lib/env";
import { qstashClient } from "@/lib/qstash";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/server/actions/result";
import { requireTenant } from "@/server/auth";
import { KB_SOURCES_BUCKET, MAX_KB_BYTES, pathKb } from "@/server/services/storage";

type UploadKbInput = { fileName: string; mimeType: string; sizeBytes: number };

/** Passo 1: signed upload URL para o material da base (PDF). */
export async function criarUrlUploadKb(
  input: UploadKbInput,
): Promise<ActionResult<{ path: string; token: string; docId: string }>> {
  const ctx = await requireTenant();
  if (input.mimeType !== "application/pdf") {
    return { ok: false, erro: "Apenas PDF é aceito no momento." };
  }
  if (input.sizeBytes <= 0 || input.sizeBytes > MAX_KB_BYTES) {
    return { ok: false, erro: "Arquivo muito grande (máximo 100 MB)." };
  }

  const docId = crypto.randomUUID();
  const path = pathKb(ctx.tenant.id, docId);
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(KB_SOURCES_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) return { ok: false, erro: "Não foi possível iniciar o envio." };
  return { ok: true, data: { path: data.path, token: data.token, docId } };
}

/** Passo 2: cria o kb_document e enfileira a ingestão no QStash. */
export async function confirmarUploadKb(input: {
  docId: string;
  storagePath: string;
  title: string;
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
    source_type: "pdf",
    license_note: "Declarado como material de posse legal pela profissional.",
    status: "queued",
    created_by: ctx.user.id,
  });
  if (error) return { ok: false, erro: "Não foi possível registrar o material." };

  // Enfileira a ingestão. Se o QStash não estiver configurado, o material fica
  // 'queued' e pode ser reprocessado depois (não bloqueia o cadastro).
  try {
    await qstashClient().publishJSON({
      url: `${env().APP_URL}/api/jobs/ingest`,
      body: { documentId: input.docId, startPage: 0 },
    });
  } catch {
    // silencioso: sem QStash configurado ainda
  }

  revalidatePath("/conhecimento");
  return { ok: true, data: null };
}

export async function excluirKbDocumento(docId: string): Promise<ActionResult> {
  await requireTenant();
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("kb_documents")
    .select("storage_path, scope")
    .eq("id", docId)
    .maybeSingle();
  if (doc?.scope !== "tenant") {
    return { ok: false, erro: "Material não encontrado." };
  }

  // Remove o objeto no Storage (path é 'kb-sources/{tenant}/{id}.pdf').
  const objectPath = doc.storage_path.replace(/^kb-sources\//, "");
  await supabase.storage.from(KB_SOURCES_BUCKET).remove([objectPath]);
  // Remove a linha (cascade apaga os chunks).
  const { error } = await supabase.from("kb_documents").delete().eq("id", docId);
  if (error) return { ok: false, erro: "Não foi possível excluir o material." };

  revalidatePath("/conhecimento");
  return { ok: true, data: null };
}
