import "server-only";
import mammoth from "mammoth";
import { extrairTextoPdf } from "@/server/services/pdf";
import { DOCX_MIME } from "@/server/services/storage";
import { transcreverArquivo } from "@/server/services/transcribe";

/**
 * Extrai texto de um documento conforme o tipo:
 * - text/plain → decodifica direto (texto colado)
 * - docx → mammoth
 * - pdf → unpdf; se escaneado (sem texto) → visão da IA
 * - imagem → visão da IA
 * O texto alimenta o dossiê da IA e NUNCA é vetorizado (fronteira LGPD).
 */
export async function extrairTextoDocumento(opts: {
  bytes: Uint8Array;
  mimeType: string;
  tenantId: string;
  userId: string | null;
}): Promise<string | null> {
  const { bytes, mimeType } = opts;

  if (mimeType === "text/plain") {
    const t = new TextDecoder().decode(bytes).trim();
    return t ? t.slice(0, 100_000) : null;
  }

  if (mimeType === DOCX_MIME) {
    try {
      const { value } = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      const t = value.trim();
      return t.length > 10 ? t.slice(0, 100_000) : null;
    } catch {
      return null;
    }
  }

  if (mimeType === "application/pdf") {
    const texto = await extrairTextoPdf(bytes);
    if (texto) return texto;
    return transcreverArquivo(opts); // PDF escaneado → visão
  }

  if (mimeType.startsWith("image/")) {
    return transcreverArquivo(opts);
  }

  return null;
}
