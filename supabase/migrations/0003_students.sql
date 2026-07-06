-- 0003_students — Fase 2
-- Gestão de alunos (CRUD) + trilha de auditoria (LGPD).
-- Autoridade: docs/plan/02-banco-de-dados.md (seções 1.2, 1.10, 2.2, 2.3).

-- ============================================================================
-- students
-- ============================================================================
create table public.students (
  id                      uuid primary key default gen_random_uuid(),
  tenant_id               uuid not null references public.tenants (id) on delete cascade,
  full_name               text not null,
  birth_date              date,
  sex                     text check (sex in ('female', 'male', 'other', 'not_informed')),
  cpf                     text,                    -- opcional (minimização LGPD)
  phone                   text,
  email                   text,
  occupation              text,
  emergency_contact_name  text,
  emergency_contact_phone text,
  status                  text not null default 'active'
                          check (status in ('active', 'paused', 'archived')),
  general_notes           text,
  -- LGPD
  consent_signed_at       timestamptz,
  consent_version         text,
  consent_document_id     uuid,                    -- FK p/ documents adicionada na migration 0007
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  deleted_at              timestamptz              -- soft delete (exclusão em 2 fases)
);
create index students_tenant_idx on public.students (tenant_id);
create index students_name_trgm_idx on public.students using gin (full_name gin_trgm_ops);

create trigger set_updated_at
before update on public.students
for each row execute function private.set_updated_at();

-- 4 policies padrão (posse por tenant).
alter table public.students enable row level security;

create policy "students_select" on public.students
for select to authenticated
using (tenant_id in (select private.user_tenant_ids()));

create policy "students_insert" on public.students
for insert to authenticated
with check (tenant_id in (select private.user_tenant_ids()));

create policy "students_update" on public.students
for update to authenticated
using (tenant_id in (select private.user_tenant_ids()))
with check (tenant_id in (select private.user_tenant_ids()));

create policy "students_delete" on public.students
for delete to authenticated
using (tenant_id in (select private.user_tenant_ids()));

grant select, insert, update, delete on public.students to authenticated;
grant all on public.students to service_role;

-- ============================================================================
-- audit_logs — insert-only e imutável para usuárias (LGPD)
-- ============================================================================
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  tenant_id   uuid not null,
  user_id     uuid,
  action      text not null,        -- 'student.create', 'student.delete', ...
  entity_type text not null,
  entity_id   uuid,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index audit_logs_tenant_idx on public.audit_logs (tenant_id, created_at desc);

alter table public.audit_logs enable row level security;

-- INSERT no próprio tenant; SELECT apenas owner; sem UPDATE/DELETE (imutável).
create policy "audit_logs_insert" on public.audit_logs
for insert to authenticated
with check (tenant_id in (select private.user_tenant_ids()));

create policy "audit_logs_select" on public.audit_logs
for select to authenticated
using (
  tenant_id in (
    select tenant_id from public.tenant_members
    where user_id = (select auth.uid()) and role = 'owner'
  )
);

grant select, insert on public.audit_logs to authenticated;
grant all on public.audit_logs to service_role;
