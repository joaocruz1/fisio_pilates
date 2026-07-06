import "server-only";
import { gerarEmbedding, vetorParaSql } from "@/lib/ai/embeddings";
import { buscarWeb, type WebResult } from "@/lib/ai/tavily";
import { createClient } from "@/lib/supabase/server";

export type KbChunk = {
  id: number;
  document_id: string;
  content: string;
  context_header: string | null;
  page_start: number | null;
  similarity: number;
};

/**
 * Busca no RAG: embeda a query, chama match_kb_chunks (híbrida RRF) e, se a base
 * local não cobrir bem o assunto (gatilho de fallback), complementa com a web.
 * Alimenta tanto o relatório (04-ia.md) quanto o chat. Sempre chamado do servidor.
 */
export async function ragSearch(
  query: string,
  opts: { tenantId: string; k?: number; forcarWeb?: boolean },
): Promise<{ kbChunks: KbChunk[]; webResults: WebResult[] }> {
  const supabase = await createClient();
  const embedding = await gerarEmbedding(query);

  const { data } = await supabase.rpc("match_kb_chunks", {
    query_embedding: vetorParaSql(embedding),
    query_text: query,
    p_tenant_id: opts.tenantId,
    match_count: opts.k ?? 8,
  });
  const kbChunks: KbChunk[] = (data ?? []).map((d) => ({
    id: d.id,
    document_id: d.document_id,
    content: d.content,
    context_header: d.context_header,
    page_start: d.page_start,
    similarity: d.similarity,
  }));

  // Gatilho de fallback web (03-rag.md §5.2): base local não cobre o assunto.
  const top1 = kbChunks[0]?.similarity ?? 0;
  const fortes = kbChunks.filter((c) => c.similarity > 0.35).length;
  const cobre = top1 >= 0.5 && fortes >= 3;

  const webResults = opts.forcarWeb || !cobre ? await buscarWeb(query) : [];
  return { kbChunks, webResults };
}
