-- Teste de isolamento RLS — Fase 3 (assessments, student_conditions, sessions,
-- session_exercises, body_measurements) + caso especial de exercises
-- (catálogo global visível a todas; dados clínicos isolados por tenant).
-- Roda via `supabase test db` (pgTAP). Ver docs/plan/09-testes-qualidade.md.

begin;

select plan(8);

insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password,
   email_confirmed_at, created_at, updated_at, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-00000000000a',
   'authenticated','authenticated','ana@example.com','',now(),now(),now(),'{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-00000000000b',
   'authenticated','authenticated','bia@example.com','',now(),now(),now(),'{}'::jsonb);

-- ---------------------------------------------------------------------------
-- Usuária A: fluxo clínico completo (inserts derivados via RLS)
-- ---------------------------------------------------------------------------
set local request.jwt.claims to
  '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;

insert into public.students (tenant_id, full_name)
select tenant_id, 'Maria' from public.tenant_members;

insert into public.assessments (tenant_id, student_id, created_by, main_complaint)
select tenant_id, id, '00000000-0000-0000-0000-00000000000a', 'Dor lombar'
from public.students where full_name = 'Maria';

insert into public.student_conditions (tenant_id, student_id, name)
select tenant_id, id, 'Hérnia L4-L5' from public.students where full_name = 'Maria';

insert into public.sessions (tenant_id, student_id, created_by, focus)
select tenant_id, id, '00000000-0000-0000-0000-00000000000a', 'core'
from public.students where full_name = 'Maria';

insert into public.session_exercises (tenant_id, session_id, exercise_id, sets, reps)
select se.tenant_id, se.id,
       (select id from public.exercises where tenant_id is null limit 1), 3, 10
from public.sessions se;

insert into public.body_measurements (tenant_id, student_id, weight_kg)
select tenant_id, id, 62.5 from public.students where full_name = 'Maria';

select is((select count(*) from public.students)::int, 1, 'A vê o próprio aluno');
select is((select count(*) from public.assessments)::int, 1, 'A vê a própria avaliação');
select is((select count(*) from public.sessions)::int, 1, 'A vê a própria sessão');
select is((select count(*) from public.session_exercises)::int, 1, 'A vê os exercícios da sessão');
select is((select count(*) from public.body_measurements)::int, 1, 'A vê a própria medida');
select ok((select count(*) from public.exercises) >= 80, 'A enxerga o catálogo global de exercícios');

reset role;

-- ---------------------------------------------------------------------------
-- Usuária B: nada dos dados clínicos de A; mas vê o catálogo global
-- ---------------------------------------------------------------------------
set local request.jwt.claims to
  '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*) from public.students)::int
    + (select count(*) from public.assessments)::int
    + (select count(*) from public.sessions)::int
    + (select count(*) from public.body_measurements)::int,
  0,
  'B NÃO enxerga nenhum dado clínico de A (isolamento R1)'
);
select ok(
  (select count(*) from public.exercises) >= 80,
  'B enxerga o catálogo global (exercícios globais são compartilhados)'
);

reset role;

select * from finish();
rollback;
