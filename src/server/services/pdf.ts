import "server-only";
import { extractText, getDocumentProxy } from "unpdf";

/**
 * Extrai texto de um PDF (runtime nodejs). Retorna null para PDF escaneado
 * (sem camada de texto) ou em caso de erro — o OCR fica fora do MVP.
 * O texto extraído alimenta o prompt da IA e NUNCA é vetorizado (fronteira LGPD).
 */
export async function extrairTextoPdf(bytes: Uint8Array): Promise<string | null> {
  try {
    const pdf = await getDocumentProxy(bytes);
    const { text } = await extractText(pdf, { mergePages: true });
    const full = (Array.isArray(text) ? text.join("\n") : text).trim();
    return full.length > 20 ? full.slice(0, 100_000) : null;
  } catch {
    return null;
  }
}

/** Extrai o texto página a página (para a ingestão do RAG em lotes). */
export async function extrairPaginasPdf(
  bytes: Uint8Array,
): Promise<{ totalPages: number; pages: string[] }> {
  const pdf = await getDocumentProxy(bytes);
  const { totalPages, text } = await extractText(pdf, { mergePages: false });
  const pages = Array.isArray(text) ? text : [text];
  return { totalPages, pages };
}
