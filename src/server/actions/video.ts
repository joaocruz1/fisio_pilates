"use server";
import "server-only";
import { env } from "@/lib/env";
import { requireTenant } from "@/server/auth";

/** Extrai o 1º videoId da página de resultados do YouTube (sem API key). */
async function resolverPorScrape(q: string): Promise<string | null> {
  try {
    const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(q)}&sp=EgIQAQ%253D%253D`;
    const res = await fetch(url, {
      headers: {
        // UA de navegador evita a página de consentimento/variações mobile.
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36",
        "Accept-Language": "pt-BR,pt;q=0.9",
      },
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) return null;
    const html = await res.text();
    const m = html.match(/"videoId":"([\w-]{11})"/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

/** Resolve o videoId via YouTube Data API (mais preciso; exige YOUTUBE_API_KEY). */
async function resolverPorApi(q: string, key: string): Promise<string | null> {
  try {
    const url =
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video` +
      `&videoEmbeddable=true&maxResults=1&safeSearch=strict&q=${encodeURIComponent(q)}&key=${key}`;
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
    if (!res.ok) return null;
    const json = (await res.json()) as { items?: { id?: { videoId?: string } }[] };
    return json.items?.[0]?.id?.videoId ?? null;
  } catch {
    return null;
  }
}

/**
 * Resolve o vídeo mais relevante do YouTube para um exercício, para reproduzir
 * DENTRO do app. Usa a YouTube Data API se YOUTUBE_API_KEY estiver configurada
 * (mais preciso e filtra embeddable), senão extrai o 1º resultado da busca
 * (keyless). Retorna null só se ambos falharem → o app cai nos links externos.
 */
export async function resolverVideoExercicio(nome: string): Promise<{ videoId: string | null }> {
  await requireTenant();
  const q = `Pilates ${nome.trim()} exercício`;
  const key = env().YOUTUBE_API_KEY;
  const videoId = key
    ? ((await resolverPorApi(q, key)) ?? (await resolverPorScrape(q)))
    : await resolverPorScrape(q);
  return { videoId };
}
