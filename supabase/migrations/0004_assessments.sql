-- 0004_assessments — Fase 3
-- Avaliação fisioterapêutica / anamnese + condições clínicas do aluno.
-- Autoridade: docs/plan/02-banco-de-dados.md (seções 1.3, 2.2, 3).

-- ============================================================================
-- assessments (reavaliação = nova linha; nunca update da inicial)
-- ============================================================================
create table public.assessments (
  id                  uuid primary key default gen_random_uuid(),
  tenant_id           uuid not null references public.tenants (id) on delete cascade,
  student_id          uuid not null references public.students (id) on delete cascade,
  kind                text not null default 'initial'
                      check (kind in ('initial', 'reassessment', 'discharge')),
  assessed_at         date not null default current_date,
  main_complaint      text,
  clinical_diagnosis  text,
  goals               text[],
  pain_level_initial  smallint check (pain_level_initial between 0 and 10),
  anamnesis           jsonb not null default '{}',       -- HDA, HPP, medicamentos…
  postural_assessment jsonb not null default '{}',       -- vistas ant/post/lateral
  physical_tests      jsonb not null default '{}',       -- ADM, força, testes
  contraindications   text[],
  notes               text,
  created_by          uuid not null references auth.users (id),
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  deleted_at          timestamptz
);
create index assessments_student_idx on public.assessments (tenant_id, student_id, assessed_at desc);

create trigger set_updated_at
before update on public.assessments
for each row execute function private.set_updated_at();

alter table public.assessments enable row level security;

create policy "assessments_select" on public.assessments
for select to authenticated
using (tenant_id in (select private.user_tenant_ids()));
create policy "assessments_insert" on public.assessments
for insert to authenticated
with check (tenant_id in (select private.user_tenant_ids()));
create policy "assessments_update" on public.assessments
for update to authenticated
using (tenant_id in (select private.user_tenant_ids()))
with check (tenant_id in (select private.user_tenant_ids()));
create policy "assessments_delete" on public.assessments
for delete to authenticated
using (tenant_id in (select private.user_tenant_ids()));

grant select, insert, update, delete on public.assessments to authenticated;
grant all on public.assessments to service_role;

-- ============================================================================
-- student_conditions (patologias/condições como linhas filtráveis)
-- ============================================================================
create table public.student_conditions (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants (id) on delete cascade,
  student_id   uuid not null references public.students (id) on delete cascade,
  name         text not null,
  cid_code     text,
  status       text not null default 'active'
               check (status in ('active', 'resolved', 'under_observation')),
  severity     text check (severity in ('mild', 'moderate', 'severe')),
  notes        text,
  diagnosed_at date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index student_conditions_student_idx on public.student_conditions (tenant_id, student_id);

create trigger set_updated_at
before update on public.student_conditions
for each row execute function private.set_updated_at();

alter table public.student_conditions enable row level security;

create policy "student_conditions_select" on public.student_conditions
for select to authenticated
using (tenant_id in (select private.user_tenant_ids()));
create policy "student_conditions_insert" on public.student_conditions
for insert to authenticated
with check (tenant_id in (select private.user_tenant_ids()));
create policy "student_conditions_update" on public.student_conditions
for update to authenticated
using (tenant_id in (select private.user_tenant_ids()))
with check (tenant_id in (select private.user_tenant_ids()));
create policy "student_conditions_delete" on public.student_conditions
for delete to authenticated
using (tenant_id in (select private.user_tenant_ids()));

grant select, insert, update, delete on public.student_conditions to authenticated;
grant all on public.student_conditions to service_role;
