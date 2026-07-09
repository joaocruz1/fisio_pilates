"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type DocumentoMetaInput, documentoMetaSchema } from "@/lib/validators/documento";
import type { ActionResult } from "@/server/actions/result";
import { requireTenant } from "@/server/auth";
import { registrarAuditoria } from "@/server/services/audit";
import { extrairTextoDocumento } from "@/server/services/extract";
import {
  ALLOWED_DOC_MIMES,
  MAX_DOC_BYTES,
  pathDocumento,
  STUDENT_DOCS_BUCKET,
} from "@/server/services/storage";

const EXTRACAO_MAX_BYTES = 10 * 1024 * 1024; // extrai texto de PDFs até 10 MB (síncrono)

type UploadInput = { fileName: string; mimeType: string; sizeBytes: number };

/** Passo 1: valida e gera uma signed upload URL para o browser enviar direto ao Storage. */
export async function criarUrlUpload(
  studentId: string,
  input: UploadInput,
): Promise<ActionResult<{ path: string; token: string; docId: string }>> {
  const ctx = await requireTenant();

  if (!ALLOWED_DOC_MIMES.includes(input.mimeType as (typeof ALLOWED_DOC_MIMES)[number])) {
    return { ok: false, erro: "Tipo de arquivo não permitido (use PDF, JPG, PNG ou WEBP)." };
  }
  if (input.sizeBytes <= 0 || input.sizeBytes > MAX_DOC_BYTES) {
    return { ok: false, erro: "Arquivo muito grande (máximo 25 MB)." };
  }

  const docId = crypto.randomUUID();
  const path = pathDocumento(ctx.tenant.id, studentId, docId, input.fileName);
  const supabase = await createClient();
  const { data, error } = await supabase.storage
    .from(STUDENT_DOCS_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data) return { ok: false, erro: "Não foi possível iniciar o envio." };

  return { ok: true, data: { path: data.path, token: data.token, docId } };
}

/** Passo 2: grava o metadado no banco e extrai texto de PDFs pequenos. */
export async function confirmarUpload(
  studentId: string,
  input: UploadInput & { storagePath: string; docId: string; meta: DocumentoMetaInput },
): Promise<ActionResult> {
  const ctx = await requireTenant();

  const metaParsed = documentoMetaSchema.safeParse(input.meta);
  if (!metaParsed.success) {
    return { ok: false, erro: metaParsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const meta = metaParsed.data;
  const supabase = await createClient();

  // Extrai texto (pdf/docx/texto/imagem) para alimentar a IA. Imagens e PDFs
  // escaneados passam por transcrição de visão. (Em produção, mover extração
  // pesada para um job de fundo por causa do timeout de serverless.)
  let extractedText: string | null = null;
  if (input.sizeBytes <= EXTRACAO_MAX_BYTES) {
    const { data: blob } = await supabase.storage
      .from(STUDENT_DOCS_BUCKET)
      .download(input.storagePath);
    if (blob) {
      extractedText = await extrairTextoDocumento({
        bytes: new Uint8Array(await blob.arrayBuffer()),
        mimeType: input.mimeType,
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
      });
    }
  }

  const { error } = await supabase.from("documents").insert({
    id: input.docId,
    tenant_id: ctx.tenant.id,
    student_id: studentId,
    kind: meta.kind,
    bucket: STUDENT_DOCS_BUCKET,
    storage_path: input.storagePath,
    file_name: input.fileName,
    mime_type: input.mimeType,
    size_bytes: input.sizeBytes,
    taken_at: meta.takenAt?.trim() || null,
    description: meta.description?.trim() || null,
    extracted_text: extractedText,
    uploaded_by: ctx.user.id,
  });
  if (error) return { ok: false, erro: "Não foi possível salvar o documento." };

  await registrarAuditoria(supabase, {
    tenantId: ctx.tenant.id,
    userId: ctx.user.id,
    action: "document.upload",
    entityType: "document",
    entityId: input.docId,
    metadata: { kind: meta.kind },
  });

  revalidatePath(`/alunos/${studentId}/documentos`);
  return { ok: true, data: null };
}

/** Gera uma signed URL de curta duração para visualizar/baixar (com auditoria). */
export async function gerarUrlDownload(documentId: string): Promise<ActionResult<{ url: string }>> {
  const ctx = await requireTenant();
  const supabase = await createClient();

  const { data: doc } = await supabase
    .from("documents")
    .select("bucket, storage_path")
    .eq("id", documentId)
    .is("deleted_at", null)
    .maybeSingle();
  if (!doc) return { ok: false, erro: "Documento não encontrado." };

  const { data, error } = await supabase.storage
    .from(doc.bucket)
    .createSignedUrl(doc.storage_path, 120);
  if (error || !data) return { ok: false, erro: "Não foi possível gerar o link." };

  await registrarAuditoria(supabase, {
    tenantId: ctx.tenant.id,
    userId: ctx.user.id,
    action: "document.download",
    entityType: "document",
    entityId: documentId,
  });

  return { ok: true, data: { url: data.signedUrl } };
}

export async function excluirDocumento(
  documentId: string,
  studentId: string,
): Promise<ActionResult> {
  const ctx = await requireTenant();
  const supabase = await createClient();

  const { error } = await supabase
    .from("documents")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", documentId)
    .is("deleted_at", null);
  if (error) return { ok: false, erro: "Não foi possível excluir o documento." };

  await registrarAuditoria(supabase, {
    tenantId: ctx.tenant.id,
    userId: ctx.user.id,
    action: "document.delete",
    entityType: "document",
    entityId: documentId,
  });

  revalidatePath(`/alunos/${studentId}/documentos`);
  return { ok: true, data: null };
}
