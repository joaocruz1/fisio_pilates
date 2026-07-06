import { NextResponse } from "next/server";
import { gerarEmbeddings, vetorParaSql } from "@/lib/ai/embeddings";
import { env } from "@/lib/env";
import { qstashClient, qstashReceiver } from "@/lib/qstash";
import { createAdminClient } from "@/lib/supabase/admin";
import { chunkText } from "@/server/services/chunking";
import { extrairPaginasPdf } from "@/server/services/pdf";

// Worker de ingestão da KB, disparado pelo QStash em lotes de 50 páginas
// auto-encadeados e idempotentes. Ver docs/plan/03-rag.md.
export const runtime = "nodejs";
export const maxDuration = 300;

const BATCH_PAGES = 50;
const EMBED_BATCH = 96;
const KB_BUCKET = "kb-sources";

export async function POST(req: Request) {
  const raw = await req.text();

  // 1) Verificar assinatura do QStash antes de qualquer processamento.
  const signature = req.headers.get("upstash-signature");
  if (!signature) return NextResponse.json({ erro: "sem assinatura" }, { status: 401 });
  try {
    const ok = await qstashReceiver().verify({ signature, body: raw });
    if (!ok) return NextResponse.json({ erro: "assinatura inválida" }, { status: 401 });
  } catch {
    return NextResponse.json({ erro: "assinatura inválida" }, { status: 401 });
  }

  const { documentId, startPage = 0 } = JSON.parse(raw || "{}") as {
    documentId?: string;
    startPage?: number;
  };
  if (!documentId) return NextResponse.json({ erro: "documentId ausente" }, { status: 400 });

  const supabase = createAdminClient();

  const { data: doc } = await supabase
    .from("kb_documents")
    .select("*")
    .eq("id", documentId)
    .maybeSingle();
  if (!doc) return NextResponse.json({ erro: "documento não encontrado" }, { status: 404 });

  try {
    // storage_path é gravado como "kb-sources/{tenant}/{id}.pdf"; o download
    // precisa do path SEM o prefixo do bucket.
    const objectPath = doc.storage_path.replace(/^kb-sources\//, "");
    const { data: blob, error: dlErr } = await supabase.storage
      .from(KB_BUCKET)
      .download(objectPath);
    if (dlErr || !blob) throw new Error("falha ao baixar o PDF");

    const { totalPages, pages } = await extrairPaginasPdf(new Uint8Array(await blob.arrayBuffer()));

    if (startPage === 0) {
      await supabase.from("kb_chunks").delete().eq("document_id", documentId); // idempotência total
      await supabase
        .from("kb_documents")
        .update({
          status: "processing",
          total_pages: totalPages,
          processed_pages: 0,
          chunk_count: 0,
        })
        .eq("id", documentId);
    } else {
      // idempotência do lote (retry do QStash): limpa a faixa antes de reinserir
      await supabase
        .from("kb_chunks")
        .delete()
        .eq("document_id", documentId)
        .gte("page_start", startPage + 1)
        .lte("page_start", startPage + BATCH_PAGES);
    }

    const endPage = Math.min(startPage + BATCH_PAGES, totalPages);

    // Monta os chunks do lote (com cabeçalho contextual por página).
    const pendentes: { content: string; header: string; page: number }[] = [];
    for (let p = startPage; p < endPage; p++) {
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
        processed_pages: endPage,
        chunk_count: (doc.chunk_count ?? 0) + inseridos,
        embedding_model: env().EMBEDDINGS_MODEL,
      })
      .eq("id", documentId);

    // 2) Auto-encadear o próximo lote, ou finalizar.
    if (endPage < totalPages) {
      await qstashClient().publishJSON({
        url: `${env().APP_URL}/api/jobs/ingest`,
        body: { documentId, startPage: endPage },
      });
    } else {
      await supabase.from("kb_documents").update({ status: "ready" }).eq("id", documentId);
    }

    return NextResponse.json({ ok: true, processedPages: endPage, totalPages, inseridos });
  } catch (e) {
    await supabase
      .from("kb_documents")
      .update({ status: "failed", error_message: e instanceof Error ? e.message : "erro" })
      .eq("id", documentId);
    return NextResponse.json({ erro: "falha na ingestão" }, { status: 500 });
  }
}
