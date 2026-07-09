import "server-only";
import { gerarEmbeddings, vetorParaSql } from "@/lib/ai/embeddings";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { chunkText } from "@/server/services/chunking";
import { extrairTextoDocumento } from "@/server/services/extract";
import { KB_SOURCES_BUCKET, mimeDoPath } from "@/server/services/storage";
import { extrairTextoUrl } from "@/server/services/url-extract";

const EMBED_BATCH = 96;

/**
 * Ingestão SÍNCRONA e unificada de uma fonte da base do tenant. Suporta:
 * - arquivo (PDF, DOCX, texto, imagem) baixado do Storage → extract.ts
 * - link (source_type='url') → conteúdo da página baixado e extraído
 * Diferente de `ingerirKbDocumento` (paginada, só PDF, usada pelo worker global),
 * aqui o texto é tratado como um bloco único e fatiado por `chunkText`.
 * Idempotente: limpa os chunks antes de reinserir. Usa client admin (bypassa
 * RLS) — o chamador garante que o documento pertence ao tenant correto.
 */
export async function ingerirFonteKb(
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
    await supabase
      .from("kb_documents")
      .update({ status: "processing", processed_pages: 0, chunk_count: 0 })
      .eq("id", documentId);

    // 1) Obtém o texto conforme a origem.
    let texto: string | null = null;
    if (doc.source_type === "url") {
      if (!doc.source_url) throw new Error("link de origem ausente");
      const res = await extrairTextoUrl(doc.source_url);
      if (!res) throw new Error("não foi possível ler o conteúdo do link");
      texto = res.texto;
    } else {
      const objectPath = doc.storage_path.replace(/^kb-sources\//, "");
      const { data: blob, error: dlErr } = await supabase.storage
        .from(KB_SOURCES_BUCKET)
        .download(objectPath);
      if (dlErr || !blob) throw new Error("falha ao baixar o arquivo");
      const mime = mimeDoPath(doc.storage_path) ?? "application/pdf";
      texto = await extrairTextoDocumento({
        bytes: new Uint8Array(await blob.arrayBuffer()),
        mimeType: mime,
        tenantId: doc.tenant_id ?? "",
        userId: doc.created_by,
      });
    }

    const limpo = (texto ?? "").trim();
    if (limpo.length < 50) {
      throw new Error("conteúdo vazio ou muito curto para indexar");
    }

    // 2) Fatia e monta os chunks (cabeçalho = título do material).
    const pedacos = chunkText(limpo);
    const pendentes = pedacos.map((content) => ({ content, header: doc.title }));

    // Idempotência: limpa chunks anteriores.
    await supabase.from("kb_chunks").delete().eq("document_id", documentId);

    // 3) Embeddings + insert em sub-lotes.
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
        chunk_count: inseridos,
        embedding_model: env().EMBEDDINGS_MODEL,
      })
      .eq("id", documentId);

    return { ok: true, chunks: inseridos };
  } catch (e) {
    const erro = e instanceof Error ? e.message : "erro";
    console.error(`[kb-ingest-fonte] falha ao ingerir ${documentId}:`, erro);
    await supabase
      .from("kb_documents")
      .update({ status: "failed", error_message: erro })
      .eq("id", documentId);
    return { ok: false, chunks: 0, erro };
  }
}
