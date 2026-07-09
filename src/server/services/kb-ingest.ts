import "server-only";
import { gerarEmbeddings, vetorParaSql } from "@/lib/ai/embeddings";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { chunkText } from "@/server/services/chunking";
import { extrairPaginasPdf } from "@/server/services/pdf";

const EMBED_BATCH = 96;
const KB_BUCKET = "kb-sources";

/**
 * Ingestão COMPLETA e SÍNCRONA de um documento da KB (todas as páginas de uma
 * vez, sem encadear lotes via QStash). Usada como fallback quando o QStash não
 * está configurado e pelo botão de "reprocessar". Idempotente: limpa os chunks
 * antes de reinserir. Usa o client admin (bypassa RLS) — o chamador é
 * responsável por garantir que o documento pertence ao tenant correto.
 */
export async function ingerirKbDocumento(
  documentId: string,
): Promise<{ ok: boolean; chunks: number; erro?: string }> {
  const supabase = createAdminClient();

  const { data: doc } = await supabase
    .from("kb_documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) return { ok: false, chunks: 0, erro: "documento não encontrado" };

  try {
    // storage_path é gravado como "kb-sources/{tenant}/{id}.pdf"; o download
    // precisa do path SEM o prefixo do bucket.
    const objectPath = doc.storage_path.replace(/^kb-sources\//, "");
    const { data: blob, error: dlErr } = await supabase.storage
      .from(KB_BUCKET)
      .download(objectPath);
    if (dlErr || !blob) throw new Error("falha ao baixar o PDF");

    const { totalPages, pages } = await extrairPaginasPdf(new Uint8Array(await blob.arrayBuffer()));

    // Idempotência total: limpa chunks anteriores e reinicia o progresso.
    await supabase.from("kb_chunks").delete().eq("document_id", documentId);
    await supabase
      .from("kb_documents")
      .update({ status: "processing", total_pages: totalPages, processed_pages: 0, chunk_count: 0 })
      .eq("id", documentId);

    // Monta todos os chunks (com cabeçalho contextual por página).
    const pendentes: { content: string; header: string; page: number }[] = [];
    for (let p = 0; p < totalPages; p++) {
      const texto = pages[p] ?? "";
      for (const c of chunkText(texto)) {
        pendentes.push({ content: c, header: `${doc.title} (p.${p + 1})`, page: p + 1 });
      }
    }

    // Embeddings + insert em sub-lotes.
    let inseridos = 0;
    for (let i = 0; i < pendentes.length; i += EMBED_BATCH) {
      const slice = pendentes.slice(i, i + EMBED_BATCH);
      const vetores = await gerarEmbeddings(slice.map((c) => `${c.header}\n${c.content}`));
      const rows = slice.map((c, j) => ({
        document_id: documentId,
        tenant_id: doc.tenant_id,
        scope: doc.scope,
        content: c.content,
        context_header: c.header,
        page_start: c.page,
        page_end: c.page,
        token_count: Math.round(c.content.length / 4),
        embedding: vetorParaSql(vetores[j] ?? []),
      }));
      const { error: insErr } = await supabase.from("kb_chunks").insert(rows);
      if (insErr) throw new Error(`falha ao inserir chunks: ${insErr.message}`);
      inseridos += rows.length;
    }

    await supabase
      .from("kb_documents")
      .update({
        status: "ready",
        processed_pages: totalPages,
        chunk_count: inseridos,
        embedding_model: env().EMBEDDINGS_MODEL,
      })
      .eq("id", documentId);

    return { ok: true, chunks: inseridos };
  } catch (e) {
    const erro = e instanceof Error ? e.message : "erro";
    console.error(`[kb-ingest] falha ao ingerir ${documentId}:`, erro);
    await supabase
      .from("kb_documents")
      .update({ status: "failed", error_message: erro })
      .eq("id", documentId);
    return { ok: false, chunks: 0, erro };
  }
}
