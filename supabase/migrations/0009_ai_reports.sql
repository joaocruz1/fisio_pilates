-- 0009_ai_reports — Fase 6
-- Relatórios de evolução gerados por IA + log de uso (quota mensal).
-- Autoridade: 02-banco-de-dados.md (1.7) + 04-ia.md.
-- Nota: adiciono approved_at para o fluxo rascunho→aprovação humana (04-ia.md §3);
-- status segue o enum do DDL (pending/processing/completed/failed).

create table public.ai_reports (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id) on delete cascade,
  student_id     uuid not null references public.students (id) on delete cascade,
  report_type    text not null
                 check (report_type in ('pilates_evolution', 'postural_evolution', 'full_evolution')),
  period_start   date,
  period_end     date,
  status         text not null default 'pending'
                 check (status in ('pending', 'processing', 'completed', 'failed')),
  model          text,
  structured     jsonb not null default '{}',   -- saída do generateObject (fonte de verdade)
  content_md     text,
  input_snapshot jsonb not null default '{}',   -- dossiê pseudonimizado usado (auditoria)
  input_hash     text not null,                 -- sha256 do dossiê (cache/idempotência)
  citations      jsonb not null default '[]',
  usage          jsonb not null default '{}',
  error_message  text,
  approved_at    timestamptz,                   -- NULL = rascunho; preenchido = aprovado
  requested_by   uuid not null references auth.users (id),
  created_at     timestamptz not null default now(),
  completed_at   timestamptz,
  unique (tenant_id, student_id, report_type, period_start, period_end, input_hash)
);
create index ai_reports_student_idx on public.ai_reports (tenant_id, student_id, created_at desc);

alter table public.ai_reports enable row level security;

create policy "ai_reports_select" on public.ai_reports
for select to authenticated using (tenant_id in (select private.user_tenant_ids()));
create policy "ai_reports_insert" on public.ai_reports
for insert to authenticated with check (tenant_id in (select private.user_tenant_ids()));
create policy "ai_reports_update" on public.ai_reports
for update to authenticated
using (tenant_id in (select private.user_tenant_ids()))
with check (tenant_id in (select private.user_tenant_ids()));
create policy "ai_reports_delete" on public.ai_reports
for delete to authenticated using (tenant_id in (select private.user_tenant_ids()));

grant select, insert, update, delete on public.ai_reports to authenticated;
grant all on public.ai_reports to service_role;

-- ============================================================================
-- ai_usage_log (relatórios + chat compartilham a quota mensal)
-- ============================================================================
create table public.ai_usage_log (
  id            bigint generated always as identity primary key,
  tenant_id     uuid not null references public.tenants (id) on delete cascade,
  user_id       uuid references auth.users (id),
  kind          text not null check (kind in ('report', 'chat', 'embedding', 'multi_query')),
  model         text,
  input_tokens  int,
  output_tokens int,
  cost_usd      numeric(10, 6),
  metadata      jsonb not null default '{}',
  created_at    timestamptz not null default now()
);
create index ai_usage_log_tenant_idx on public.ai_usage_log (tenant_id, created_at desc);

alter table public.ai_usage_log enable row level security;

create policy "ai_usage_log_select" on public.ai_usage_log
for select to authenticated using (tenant_id in (select private.user_tenant_ids()));
create policy "ai_usage_log_insert" on public.ai_usage_log
for insert to authenticated with check (tenant_id in (select private.user_tenant_ids()));

grant select, insert on public.ai_usage_log to authenticated;
grant all on public.ai_usage_log to service_role;
