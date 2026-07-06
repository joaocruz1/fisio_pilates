import "server-only";
import { env } from "@/lib/env";

/**
 * Gera embeddings via o endpoint OpenAI-compatível do OpenRouter.
 * Modelo/dimensão vêm de env (EMBEDDINGS_MODEL/DIM) — trocar de modelo exige
 * re-embeddar toda a base. Ver 03-rag.md.
 */
export async function gerarEmbeddings(textos: string[]): Promise<number[][]> {
  if (textos.length === 0) return [];
  const e = env();
  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${e.OPENROUTER_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: e.EMBEDDINGS_MODEL,
      input: textos.map((t) => t.replace(/\s+/g, " ").trim()),
    }),
  });
  if (!res.ok) {
    throw new Error(`Falha ao gerar embeddings (${res.status}): ${await res.text()}`);
  }
  const json = (await res.json()) as { data: { embedding: number[] }[] };
  return json.data.map((d) => d.embedding);
}

export async function gerarEmbedding(texto: string): Promise<number[]> {
  const [v] = await gerarEmbeddings([texto]);
  if (!v) throw new Error("Embedding vazio.");
  return v;
}

/** Serializa um vetor no formato aceito pelo pgvector via PostgREST. */
export function vetorParaSql(v: number[]): string {
  return `[${v.join(",")}]`;
}
