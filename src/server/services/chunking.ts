import "server-only";

/**
 * Chunking recursivo por caracteres com overlap, quebrando em fronteiras de
 * frase quando possível. ~2800 chars ≈ 600–700 tokens (alvo de 03-rag.md).
 */
export function chunkText(
  text: string,
  opts: { maxChars?: number; overlap?: number } = {},
): string[] {
  const maxChars = opts.maxChars ?? 2800;
  const overlap = opts.overlap ?? 300;
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = Math.min(start + maxChars, clean.length);
    if (end < clean.length) {
      const janela = clean.slice(start, end);
      const corte = Math.max(
        janela.lastIndexOf(". "),
        janela.lastIndexOf("; "),
        janela.lastIndexOf("\n"),
        janela.lastIndexOf(" "),
      );
      if (corte > maxChars * 0.5) end = start + corte + 1;
    }
    const piece = clean.slice(start, end).trim();
    if (piece) chunks.push(piece);
    if (end >= clean.length) break;
    start = Math.max(end - overlap, start + 1);
  }
  return chunks;
}
