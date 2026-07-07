// Popula a BASE GLOBAL de conhecimento (RAG) a partir dos .md em scripts/kb-seed/.
// Escreve kb_documents (scope=global) + kb_chunks via service_role, com embeddings
// reais do OpenRouter. Idempotente (re-executar substitui o seed anterior).
// Uso: node --env-file=.env.local scripts/seed-kb.mjs
import { readdirSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const OR = process.env.OPENROUTER_API_KEY;
const MODEL = process.env.EMBEDDINGS_MODEL || "openai/text-embedding-3-small";
if (!URL || !SERVICE || !OR) throw new Error("Faltam envs (Supabase URL/service_role, OpenRouter key)");

const SEED_TAG = "seed:fisiopilates-v1";
const NIL_UUID = "00000000-0000-0000-0000-000000000000";
const SEED_DIR = join(dirname(fileURLToPath(import.meta.url)), "kb-seed");

const admin = createClient(URL, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

// --- chunking (espelha src/server/services/chunking.ts) ---
function chunkText(text, { maxChars = 2800, overlap = 300 } = {}) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  if (clean.length <= maxChars) return [clean];
  const chunks = [];
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

// Fatia o markdown por seções ## e gera chunks com cabeçalho contextual.
function chunkBySections(md, title) {
  const parts = md.split(/^##\s+/m);
  const out = [];
  const intro = parts[0].replace(/^#\s+.+$/m, "").trim();
  for (const c of chunkText(intro)) out.push({ content: c, header: title });
  for (let i = 1; i < parts.length; i++) {
    const nl = parts[i].indexOf("\n");
    const heading = (nl === -1 ? parts[i] : parts[i].slice(0, nl)).trim();
    const body = (nl === -1 ? "" : parts[i].slice(nl + 1)).trim();
    for (const c of chunkText(body)) out.push({ content: c, header: `${title} — ${heading}` });
  }
  return out;
}

async function embed(textos) {
  const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
    method: "POST",
    headers: { Authorization: `Bearer ${OR}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: MODEL, input: textos.map((t) => t.replace(/\s+/g, " ").trim()) }),
  });
  if (!res.ok) throw new Error(`Embeddings falhou (${res.status}): ${await res.text()}`);
  const json = await res.json();
  return json.data.map((d) => d.embedding);
}
const vetor = (v) => `[${v.join(",")}]`;

// --- idempotência: remove o seed anterior (cascade limpa os chunks) ---
await admin.from("kb_documents").delete().eq("scope", "global").eq("license_note", SEED_TAG);

const files = readdirSync(SEED_DIR).filter((f) => f.endsWith(".md")).sort();
if (files.length === 0) throw new Error(`Nenhum .md em ${SEED_DIR}`);

let totalChunks = 0;
let totalTokens = 0;

for (const file of files) {
  const raw = readFileSync(join(SEED_DIR, file), "utf8");
  const title = (raw.match(/^#\s+(.+)$/m)?.[1] ?? file.replace(/\.md$/, "")).trim();
  const chunks = chunkBySections(raw, title);
  if (chunks.length === 0) {
    console.log(`⚠️  ${file} vazio — pulando`);
    continue;
  }

  const { data: doc, error: docErr } = await admin
    .from("kb_documents")
    .insert({
      scope: "global",
      tenant_id: null,
      title,
      author: "FisioPilates (conteúdo autoral)",
      storage_path: `global/seed/${file}`,
      source_type: "text",
      license_note: SEED_TAG,
      status: "processing",
      created_by: NIL_UUID,
    })
    .select("id")
    .single();
  if (docErr) throw docErr;

  const rows = [];
  for (let i = 0; i < chunks.length; i += 96) {
    const batch = chunks.slice(i, i + 96);
    const embs = await embed(batch.map((c) => `${c.header}\n${c.content}`));
    batch.forEach((c, j) => {
      rows.push({
        document_id: doc.id,
        tenant_id: null,
        scope: "global",
        content: c.content,
        context_header: c.header,
        page_start: null,
        page_end: null,
        token_count: Math.round(c.content.length / 4),
        embedding: vetor(embs[j]),
      });
      totalTokens += Math.round((c.header.length + c.content.length) / 4);
    });
  }

  const { error: insErr } = await admin.from("kb_chunks").insert(rows);
  if (insErr) throw insErr;

  await admin
    .from("kb_documents")
    .update({
      status: "ready",
      chunk_count: rows.length,
      embedding_model: MODEL,
      total_pages: 1,
      processed_pages: 1,
    })
    .eq("id", doc.id);

  totalChunks += rows.length;
  console.log(`✅ ${file} → ${rows.length} chunks`);
}

console.log(
  `\n🎉 Base global populada: ${files.length} documentos, ${totalChunks} chunks.\n` +
    `   Custo aprox. de embeddings: US$ ${((totalTokens / 1e6) * 0.02).toFixed(4)}`,
);
