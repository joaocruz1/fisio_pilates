-- ============================================================================
-- Permite kind='vision' em ai_usage_log
-- ============================================================================
-- O TypeScript em src/lib/ai/usage.ts já aceitava 'vision' no union, mas o
-- CHECK constraint do banco rejeitava. Alarga o CHECK para incluir o novo
-- valor, alinhando DB e código.
-- ============================================================================

alter table public.ai_usage_log
  drop constraint if exists ai_usage_log_kind_check;

alter table public.ai_usage_log
  add constraint ai_usage_log_kind_check
  check (kind in ('report', 'chat', 'embedding', 'multi_query', 'vision'));
