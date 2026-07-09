import "server-only";
import { extrairTextoPdf } from "@/server/services/pdf";

/** Decodifica as entidades HTML mais comuns. */
function decodeEntidades(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

/** Converte HTML em texto legível: remove scripts/estilos/nav e as tags. */
function htmlParaTexto(html: string): string {
  let s = html;
  // Remove blocos não-conteúdo por completo.
  s = s.replace(
    /<(script|style|noscript|svg|head|nav|header|footer|form|aside)[\s\S]*?<\/\1>/gi,
    " ",
  );
  // Preserva quebras de blocos comuns antes de remover as tags.
  s = s.replace(/<\/(p|div|li|h[1-6]|section|article|br|tr)>/gi, "\n");
  s = s.replace(/<[^>]+>/g, " ");
  s = decodeEntidades(s);
  // Normaliza espaços mantendo parágrafos.
  s = s.replace(/[ \t ]+/g, " ").replace(/\n\s*\n\s*/g, "\n\n");
  return s.trim();
}

/**
 * Baixa uma URL e extrai o texto legível (artigo). Suporta páginas HTML e PDFs
 * servidos por link. Retorna null se não conseguir texto útil. O chamador é
 * responsável pela declaração de posse legal do conteúdo.
 */
export async function extrairTextoUrl(
  url: string,
): Promise<{ texto: string; titulo: string | null } | null> {
  let resp: Response;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 20_000);
    resp = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/pdf,*/*",
      },
    });
    clearTimeout(timer);
  } catch {
    return null;
  }
  if (!resp.ok) return null;

  const contentType = resp.headers.get("content-type") ?? "";

  // PDF servido por link.
  if (contentType.includes("application/pdf") || url.toLowerCase().endsWith(".pdf")) {
    const bytes = new Uint8Array(await resp.arrayBuffer());
    const texto = await extrairTextoPdf(bytes);
    if (!texto || texto.length < 200) return null;
    return { texto: texto.slice(0, 200_000), titulo: null };
  }

  const html = await resp.text();
  const titMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const titulo = titMatch ? decodeEntidades(titMatch[1]).trim().slice(0, 200) : null;
  const texto = htmlParaTexto(html);
  if (texto.length < 200) return null;
  return { texto: texto.slice(0, 200_000), titulo };
}
