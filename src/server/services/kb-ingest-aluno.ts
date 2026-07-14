import "server-only";
import { gerarEmbeddings, vetorParaSql } from "@/lib/ai/embeddings";
import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { chunkText } from "@/server/services/chunking";

const EMBED_BATCH = 96;
const MIN_CHARS = 50;

/**
 * Ingestão SÍNCRONA de um documento de ALUNO (linha em `documents`) na KB por
 * aluno (kb_chunks scope='student'). Espelha `ingerirFonteKb` (kb-ingest-fonte),
 * mas lê o `extracted_text` já gravado por `confirmarUpload` (não re-extrai nem
 * baixa o blob). Idempotente: se já existe uma linha `kb_documents` vinculada
 * (documents.kb_document_id), limpa os chunks antes de reinserir; senão cria.
 * Usa client admin (bypassa RLS) — o chamador garante que o documento pertence
 * ao tenant/aluno corretos. LGPD: chunks de saúde do aluno ficam no mesmo tenant,
 * sob RLS; query RAG usa só termos técnicos; injeção no prompt por pseudônimo.
 */
export async function ingerirDocumentoAluno(
  documentId: string,
): Promise<{ ok: boolean; chunks: number; erro?: string }> {
  const supabase = createAdminClient();

  const { data: doc } = await supabase
    .from("documents")
    .select(
      "id, tenant_id, student_id, file_name, storage_path, extracted_text, kb_document_id, uploaded_by",
    )
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) return { ok: false, chunks: 0, erro: "documento não encontrado" };
  if (!doc.student_id) return { ok: false, chunks: 0, erro: "documento sem aluno" };
  if (!doc.extracted_text || doc.extracted_text.trim().length < MIN_CHARS) {
    // Sem texto extraído (ex.: PDF > 10 MB não extraído síncrono). Não ingeri agora.
    return { ok: false, chunks: 0, erro: "sem texto extraído" };
  }

  let kbDocId: string = "";

  try {
    // 1) Resolve/cria a linha kb_documents (scope='student').
    if (doc.kb_document_id) {
      kbDocId = doc.kb_document_id;
      await supabase.from("kb_documents").update({ status: "processing" }).eq("id", kbDocId);
      // Limpa chunks anteriores para reinserção idempotente.
      await supabase.from("kb_chunks").delete().eq("document_id", kbDocId);
    } else {
      const { data: novo, error: insErr } = await supabase
        .from("kb_documents")
        .insert({
          tenant_id: doc.tenant_id,
          student_id: doc.student_id,
          scope: "student",
          title: doc.file_name,
          storage_path: doc.storage_path,
          source_type: "student_doc",
          status: "processing",
          created_by: doc.uploaded_by,
        })
        .select("id")
        .single();
      if (insErr || !novo) throw new Error(`falha ao criar kb_documents: ${insErr?.message}`);
      kbDocId = novo.id;
      await supabase.from("documents").update({ kb_document_id: kbDocId }).eq("id", documentId);
    }

    // 2) Fatia o texto extraído (cabeçalho = nome do arquivo).
    const pedacos = chunkText(doc.extracted_text.trim());
    if (pedacos.length === 0) throw new Error("conteúdo vazio para indexar");
    const pendentes = pedacos.map((content) => ({ content, header: doc.file_name }));

    // 3) Embeddings + insert em sub-lotes.
    let inseridos = 0;
    for (let i = 0; i < pendentes.length; i += EMBED_BATCH) {
      const slice = pendentes.slice(i, i + EMBED_BATCH);
      const vetores = await gerarEmbeddings(slice.map((c) => `${c.header}\n${c.content}`));
      const rows = slice.map((c, j) => ({
        document_id: kbDocId,
        tenant_id: doc.tenant_id,
        student_id: doc.student_id,
        scope: "student",
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
      .eq("id", kbDocId);

    return { ok: true, chunks: inseridos };
  } catch (e) {
    const erro = e instanceof Error ? e.message : "erro";
    console.error(`[kb-ingest-aluno] falha ao ingerir ${documentId}:`, erro);
    if (kbDocId) {
      await supabase
        .from("kb_documents")
        .update({ status: "failed", error_message: erro })
        .eq("id", kbDocId);
    }
    return { ok: false, chunks: 0, erro };
  }
}
