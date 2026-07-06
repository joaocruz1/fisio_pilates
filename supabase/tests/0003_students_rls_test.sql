-- Teste de isolamento RLS — Fase 2 (students, audit_logs).
-- Regra R1: aluno do tenant de A nunca é visível para B.
-- Roda via `supabase test db` (pgTAP; exige o stack local com Docker).
-- Ver docs/plan/09-testes-qualidade.md (seção 2).

begin;

select plan(5);

-- Seed: 2 usuárias em tenants distintos (trigger cria tenant/profile/membership).
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password,
   email_confirmed_at, created_at, updated_at, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-00000000000a',
   'authenticated','authenticated','ana@example.com','',now(),now(),now(),'{"full_name":"Ana"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-00000000000b',
   'authenticated','authenticated','bia@example.com','',now(),now(),now(),'{"full_name":"Bia"}'::jsonb);

-- Guarda o tenant de B numa GUC de sessão (A não consegue derivá-lo via RLS).
select set_config(
  'test.tenant_b',
  (select tenant_id::text from public.tenant_members
   where user_id = '00000000-0000-0000-0000-00000000000b'),
  false
);

-- ---------------------------------------------------------------------------
-- Usuária A: cria um aluno + auditoria no próprio tenant
-- ---------------------------------------------------------------------------
set local request.jwt.claims to
  '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;

insert into public.students (tenant_id, full_name)
select tenant_id, 'Aluno da Ana' from public.tenant_members;

insert into public.audit_logs (tenant_id, user_id, action, entity_type)
select tenant_id, '00000000-0000-0000-0000-00000000000a', 'student.create', 'student'
from public.tenant_members;

select is(
  (select count(*) from public.students)::int, 1,
  'A enxerga o próprio aluno'
);
select is(
  (select count(*) from public.audit_logs)::int, 1,
  'A registra e enxerga a própria auditoria'
);

-- A não consegue inserir aluno no tenant de B (WITH CHECK → 42501).
select throws_ok(
  $$ insert into public.students (tenant_id, full_name)
     values (current_setting('test.tenant_b')::uuid, 'invasao') $$,
  '42501',
  null,
  'A não consegue criar aluno no tenant de B'
);

reset role;

-- ---------------------------------------------------------------------------
-- Usuária B: não enxerga nada do tenant de A
-- ---------------------------------------------------------------------------
set local request.jwt.claims to
  '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*) from public.students)::int, 0,
  'B NÃO enxerga o aluno de A (isolamento R1)'
);
select is(
  (select count(*) from public.audit_logs)::int, 0,
  'B NÃO enxerga a auditoria de A'
);

reset role;

select * from finish();
rollback;
