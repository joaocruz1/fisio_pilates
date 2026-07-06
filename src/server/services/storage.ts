import "server-only";
import { slugify } from "@/lib/utils";

export const STUDENT_DOCS_BUCKET = "student-documents";
export const MAX_DOC_BYTES = 25 * 1024 * 1024;
export const ALLOWED_DOC_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
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
