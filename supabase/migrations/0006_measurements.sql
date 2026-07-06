-- 0006_measurements — Fase 3
-- Medidas corporais (série temporal). Autoridade: 02-banco-de-dados.md (1.5).

create table public.body_measurements (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id) on delete cascade,
  student_id     uuid not null references public.students (id) on delete cascade,
  measured_at    date not null default current_date,
  weight_kg      numeric(5, 2),
  height_cm      numeric(5, 1),
  circumferences jsonb not null default '{}',   -- {"waist_cm":78,"hip_cm":102,...}
  flexibility    jsonb not null default '{}',   -- {"sit_and_reach_cm":12,...}
  notes          text,
  created_at     timestamptz not null default now(),
  unique (tenant_id, student_id, measured_at)   -- 1 medição/dia por aluno
);
create index body_measurements_student_idx
  on public.body_measurements (tenant_id, student_id, measured_at desc);

alter table public.body_measurements enable row level security;

create policy "body_measurements_select" on public.body_measurements
for select to authenticated
using (tenant_id in (select private.user_tenant_ids()));
create policy "body_measurements_insert" on public.body_measurements
for insert to authenticated
with check (tenant_id in (select private.user_tenant_ids()));
create policy "body_measurements_update" on public.body_measurements
for update to authenticated
using (tenant_id in (select private.user_tenant_ids()))
with check (tenant_id in (select private.user_tenant_ids()));
create policy "body_measurements_delete" on public.body_measurements
for delete to authenticated
using (tenant_id in (select private.user_tenant_ids()));

grant select, insert, update, delete on public.body_measurements to authenticated;
grant all on public.body_measurements to service_role;
