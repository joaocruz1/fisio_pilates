-- Teste de isolamento RLS — Fase 1 (tenants, profiles, tenant_members).
-- Prova base da regra R1: a usuária A NÃO enxerga o tenant de B.
-- Roda via `supabase test db` (pgTAP; exige o stack local com Docker).
-- Ver docs/plan/09-testes-qualidade.md (seção 2).

begin;

select plan(6);

-- ---------------------------------------------------------------------------
-- Seed (como superuser → RLS bypassada). Inserir em auth.users dispara o
-- trigger private.handle_new_user(), que cria tenant + profile + membership.
-- ---------------------------------------------------------------------------
insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password,
   email_confirmed_at, created_at, updated_at, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-00000000000a', 'authenticated', 'authenticated',
   'ana@example.com', '', now(), now(), now(), '{"full_name":"Ana"}'::jsonb),
  ('00000000-0000-0000-0000-000000000000',
   '00000000-0000-0000-0000-00000000000b', 'authenticated', 'authenticated',
   'bia@example.com', '', now(), now(), now(), '{"full_name":"Bia"}'::jsonb);

create temporary table _ids as
select
  (select tenant_id from public.tenant_members
   where user_id = '00000000-0000-0000-0000-00000000000a') as tenant_a,
  (select tenant_id from public.tenant_members
   where user_id = '00000000-0000-0000-0000-00000000000b') as tenant_b;

-- Sanidade: o trigger criou dois tenants distintos.
select isnt(
  (select tenant_a from _ids), (select tenant_b from _ids),
  'Cada usuária nasce com um tenant distinto'
);

-- ---------------------------------------------------------------------------
-- Identidade: usuária A (authenticated)
-- ---------------------------------------------------------------------------
set local request.jwt.claims to
  '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*) from public.tenants)::int, 1,
  'A enxerga exatamente 1 tenant (o seu) — não vê o de B'
);
select is(
  (select count(*) from public.profiles)::int, 1,
  'A enxerga apenas o próprio perfil'
);
select is(
  (select count(*) from public.tenant_members)::int, 1,
  'A enxerga apenas o próprio vínculo'
);

reset role;

-- ---------------------------------------------------------------------------
-- Identidade: usuária B (authenticated) — simétrico
-- ---------------------------------------------------------------------------
set local request.jwt.claims to
  '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*) from public.tenants)::int, 1,
  'B enxerga exatamente 1 tenant (o seu) — não vê o de A'
);

reset role;

-- ---------------------------------------------------------------------------
-- Identidade: anônima (sem sessão) — não vê nada
-- ---------------------------------------------------------------------------
set local request.jwt.claims to '{"role":"anon"}';
set local role anon;

select is(
  (select count(*) from public.tenants)::int, 0,
  'anon não enxerga nenhum tenant'
);

reset role;

select * from finish();
rollback;
