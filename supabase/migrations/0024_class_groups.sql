-- 0024_class_groups — Turmas (aulas coletivas persistentes) + alunos + ocorrências
-- Turmas nomeadas ("Turma 19h Segunda") com alunos recorrentes e ocorrências
-- (class_sessions) em datas/horários. Vive À PARTE de appointments/sessions
-- (que seguem 1 aluno por agendamento) — preserva o histórico e o fluxo 1:1.
-- O plano de IA da aula coletiva (rotação por estações) é persistido em
-- `ai_reports` (report_type 'group_session') e referenciado por
-- `class_sessions.plan_report_id` (adicionado em 0026, após 0025 estender
-- ai_reports).

-- ---------------------------------------------------------------------------
-- class_groups — a turma (recorrente)
-- ---------------------------------------------------------------------------
create table public.class_groups (
  id                    uuid primary key default gen_random_uuid(),
  tenant_id             uuid not null references public.tenants (id) on delete cascade,
  name                  text not null,                       -- ex.: "Turma 19h Segunda"
  notes                 text,
  default_duration_min  smallint not null default 50,
  max_students          smallint not null default 6
                        check (max_students between 1 and 20),
  weekday               smallint check (weekday between 0 and 6),  -- 0=domingo (opcional)
  start_time            time,                                -- horário habitual (opcional)
  status                text not null default 'active'
                        check (status in ('active','archived')),
  created_by            uuid not null references auth.users (id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  unique (tenant_id, name)
);
create index class_groups_tenant_idx on public.class_groups (tenant_id, status);

create trigger set_updated_at
before update on public.class_groups
for each row execute function private.set_updated_at();

alter table public.class_groups enable row level security;
create policy "class_groups_select" on public.class_groups
for select to authenticated using (tenant_id in (select private.user_tenant_ids()));
create policy "class_groups_insert" on public.class_groups
for insert to authenticated with check (tenant_id in (select private.user_tenant_ids()));
create policy "class_groups_update" on public.class_groups
for update to authenticated
using (tenant_id in (select private.user_tenant_ids()))
with check (tenant_id in (select private.user_tenant_ids()));
create policy "class_groups_delete" on public.class_groups
for delete to authenticated using (tenant_id in (select private.user_tenant_ids()));
grant select, insert, update, delete on public.class_groups to authenticated;
grant all on public.class_groups to service_role;

-- ---------------------------------------------------------------------------
-- class_group_students — N:N (alunos recorrentes da turma)
-- ---------------------------------------------------------------------------
create table public.class_group_students (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete cascade,
  class_group_id  uuid not null references public.class_groups (id) on delete cascade,
  student_id      uuid not null references public.students (id) on delete cascade,
  joined_at       timestamptz not null default now(),
  ordem           smallint not null default 0,   -- ordem default para a rotação
  unique (class_group_id, student_id)
);
create index cgs_group_idx on public.class_group_students (class_group_id);
create index cgs_student_idx on public.class_group_students (tenant_id, student_id);

alter table public.class_group_students enable row level security;
create policy "cgs_select" on public.class_group_students
for select to authenticated using (tenant_id in (select private.user_tenant_ids()));
create policy "cgs_insert" on public.class_group_students
for insert to authenticated with check (tenant_id in (select private.user_tenant_ids()));
create policy "cgs_update" on public.class_group_students
for update to authenticated
using (tenant_id in (select private.user_tenant_ids()))
with check (tenant_id in (select private.user_tenant_ids()));
create policy "cgs_delete" on public.class_group_students
for delete to authenticated using (tenant_id in (select private.user_tenant_ids()));
grant select, insert, update, delete on public.class_group_students to authenticated;
grant all on public.class_group_students to service_role;

-- ---------------------------------------------------------------------------
-- class_sessions — ocorrências da turma num dia/horário
-- ---------------------------------------------------------------------------
create table public.class_sessions (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete cascade,
  class_group_id  uuid not null references public.class_groups (id) on delete cascade,
  session_date    date not null,
  start_time      time not null,
  duration_min    smallint not null default 50,
  status          text not null default 'scheduled'
                  check (status in ('scheduled','completed','cancelled')),
  focus           text,
  notes           text,
  -- plan_report_id adicionado em 0026 (dependência circular com ai_reports)
  created_by      uuid not null references auth.users (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tenant_id, class_group_id, session_date, start_time)
);
create index class_sessions_date_idx on public.class_sessions (tenant_id, session_date);
create index class_sessions_group_idx on public.class_sessions (tenant_id, class_group_id);

create trigger set_updated_at
before update on public.class_sessions
for each row execute function private.set_updated_at();

alter table public.class_sessions enable row level security;
create policy "class_sessions_select" on public.class_sessions
for select to authenticated using (tenant_id in (select private.user_tenant_ids()));
create policy "class_sessions_insert" on public.class_sessions
for insert to authenticated with check (tenant_id in (select private.user_tenant_ids()));
create policy "class_sessions_update" on public.class_sessions
for update to authenticated
using (tenant_id in (select private.user_tenant_ids()))
with check (tenant_id in (select private.user_tenant_ids()));
create policy "class_sessions_delete" on public.class_sessions
for delete to authenticated using (tenant_id in (select private.user_tenant_ids()));
grant select, insert, update, delete on public.class_sessions to authenticated;
grant all on public.class_sessions to service_role;