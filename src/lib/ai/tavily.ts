import "server-only";
import { env } from "@/lib/env";

/**
 * Busca web via Tavily, restrita a domínios de saúde confiáveis.
 * LGPD: a query DEVE conter apenas termos técnicos — nunca nome/idade/qualquer
 * identificador do aluno (regra garantida por quem monta a query). Ver 03-rag.md §5.
 */
const DOMINIOS = [
  "scielo.br",
  "scielo.org",
  "pubmed.ncbi.nlm.nih.gov",
  "ncbi.nlm.nih.gov",
  "pedro.org.au",
  "bvsalud.org",
  "who.int",
];

export type WebResult = { title: string; url: string; content: string };

export async function buscarWeb(query: string): Promise<WebResult[]> {
  const apiKey = env().TAVILY_API_KEY;
  if (!apiKey) return []; // Tavily não configurado → sem fallback web (não é erro).
  try {
    const res = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        max_results: 5,
        include_domains: DOMINIOS,
      }),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as {
      results?: { title: string; url: string; content: string }[];
    };
    return (json.results ?? []).map((r) => ({ title: r.title, url: r.url, content: r.content }));
  } catch {
    return [];
  }
}
