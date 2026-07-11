-- 0025_ai_reports_group_session — estende ai_reports para a aula coletiva
-- `group_session` não tem aluno único (o plano cobre N alunos da turma), então:
--  1. `student_id` passa a ser nullable.
--  2. nova coluna `class_session_id` liga o plano à ocorrência da turma.
--  3. `report_type` ganha 'group_session'.
--  4. a unique antiga (que inclui student_id) não serve com NULL (Postgres trata
--     NULLs como distintos) — trocada por dois índices únicos parciais.

-- student_id nullable (relatórios individuais continuam com aluno; group_session não)
alter table public.ai_reports alter column student_id drop not null;

-- ligação com a ocorrência da turma
alter table public.class_sessions
  add column plan_report_id uuid references public.ai_reports (id) on delete set null;

alter table public.ai_reports
  add column class_session_id uuid references public.class_sessions (id) on delete set null;

-- report_type ganha 'group_session' (dropa o CHECK inline antigo e recria)
alter table public.ai_reports drop constraint if exists ai_reports_report_type_check;
alter table public.ai_reports add constraint ai_reports_report_type_check
  check (report_type in ('pilates_evolution','postural_evolution','full_evolution','next_session','group_session'));

-- relatórios individuais continuam exigindo aluno; group_session não
alter table public.ai_reports add constraint ai_reports_owner_check
  check (student_id is not null or report_type = 'group_session');

-- troca a unique antiga por partial uniques (NULL-safe)
alter table public.ai_reports
  drop constraint if exists ai_reports_tenant_id_student_id_report_type_period_start_period_end_input_hash_key;

create unique index if not exists ai_reports_unique_individual
  on public.ai_reports (tenant_id, student_id, report_type,
    coalesce(period_start, date '0001-01-01'), coalesce(period_end, date '0001-01-01'), input_hash)
  where student_id is not null;

create unique index if not exists ai_reports_unique_group
  on public.ai_reports (tenant_id, class_session_id, input_hash)
  where report_type = 'group_session' and class_session_id is not null;

create index if not exists ai_reports_class_session_idx
  on public.ai_reports (tenant_id, class_session_id)
  where class_session_id is not null;

-- índice do vínculo inverso (class_sessions -> plano)
create index if not exists class_sessions_plan_idx
  on public.class_sessions (plan_report_id)
  where plan_report_id is not null;