-- 0001_extensions — Fase 0
-- Extensões usadas pelo schema. Ver docs/plan/02-banco-de-dados.md (seção 7).

-- pgvector: embeddings do RAG (kb_chunks.embedding vector(1536)) — migration 0008.
create extension if not exists vector;

-- pg_trgm: busca fuzzy por nome (índice gin_trgm_ops em students.full_name) — migration 0003.
create extension if not exists pg_trgm;
