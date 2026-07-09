import "server-only";
import { slugify } from "@/lib/utils";

export const STUDENT_DOCS_BUCKET = "student-documents";
export const MAX_DOC_BYTES = 25 * 1024 * 1024;
export const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
export const ALLOWED_DOC_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  DOCX_MIME,
  "text/plain",
] as const;

export function extensao(fileName: string): string {
  const m = fileName.match(/\.([a-zA-Z0-9]+)$/);
  return m ? `.${m[1].toLowerCase()}` : "";
}

/** Path no bucket: {tenant_id}/{student_id|tenant}/{doc_id}-{slug}.ext */
export function pathDocumento(
  tenantId: string,
  studentId: string | null,
  docId: string,
  fileName: string,
): string {
  const ext = extensao(fileName);
  const base = slugify(fileName.replace(/\.[^.]+$/, "")).slice(0, 40) || "arquivo";
  return `${tenantId}/${studentId ?? "tenant"}/${docId}-${base}${ext}`;
}

// --- Base de conhecimento (RAG) ---
export const KB_SOURCES_BUCKET = "kb-sources";
export const MAX_KB_BYTES = 100 * 1024 * 1024;

/** Mimes aceitos na base de conhecimento do tenant (arquivo). */
export const ALLOWED_KB_MIMES = [
  "application/pdf",
  DOCX_MIME,
  "text/plain",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

const EXT_POR_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  [DOCX_MIME]: ".docx",
  "text/plain": ".txt",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

const MIME_POR_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".docx": DOCX_MIME,
  ".txt": "text/plain",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

/** Path no bucket kb-sources: {tenant_id}/{doc_id}.pdf (legado, só PDF). */
export function pathKb(tenantId: string, docId: string): string {
  return `${tenantId}/${docId}.pdf`;
}

/** Path no bucket kb-sources com a extensão do mime: {tenant_id}/{doc_id}.ext */
export function pathKbArquivo(tenantId: string, docId: string, mimeType: string): string {
  const ext = EXT_POR_MIME[mimeType] ?? ".bin";
  return `${tenantId}/${docId}${ext}`;
}

/** Deduz o mime a partir da extensão do storage_path (para ingestão). */
export function mimeDoPath(path: string): string | null {
  return MIME_POR_EXT[extensao(path)] ?? null;
}
