-- 0002_tenancy — Fase 0
-- Identidade e multi-tenancy: tenants, profiles, tenant_members; schema `private`
-- com helper de resolução de tenant; triggers de signup e updated_at; RLS.
-- Autoridade: docs/plan/02-banco-de-dados.md (seções 1.1, 2, 4).

-- ============================================================================
-- Schema privado (não exposto na Data API; não está em api.schemas do config)
-- ============================================================================
create schema if not exists private;
-- authenticated precisa de USAGE para as policies chamarem private.user_tenant_ids().
grant usage on schema private to authenticated;

-- ============================================================================
-- Tabelas
-- ============================================================================

-- Tenant = "consultório" da profissional (1 profissional no MVP).
create table public.tenants (
  id                   uuid primary key default gen_random_uuid(),
  name                 text not null,
  plan                 text not null default 'free'
                       check (plan in ('free', 'pro', 'trial')),      -- billing futuro
  plan_expires_at      timestamptz,
  status               text not null default 'active'
                       check (status in ('active', 'suspended', 'deleted')),
  ai_monthly_limit_usd numeric(8, 2) not null default 20.00,          -- quota de IA (04-ia.md)
  settings             jsonb not null default '{}',
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  deleted_at           timestamptz
);

-- Perfil 1:1 com auth.users (criado pelo trigger de signup).
create table public.profiles (
  id                      uuid primary key references auth.users (id) on delete cascade,
  full_name               text not null,
  phone                   text,
  crefito                 text,                          -- registro profissional (COFFITO/CREFITO)
  avatar_path             text,                          -- path no bucket avatars
  onboarding_completed_at timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);

-- Membership: hoje sempre 1 linha (owner); modelo já suporta times no futuro.
create table public.tenant_members (
  tenant_id  uuid not null references public.tenants (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null default 'owner'
             check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
-- Query mais quente do sistema (avaliada em toda policy).
create index tenant_members_user_id_idx on public.tenant_members (user_id);

-- ============================================================================
-- Helper de resolução de tenant (SECURITY DEFINER, schema não exposto)
-- ============================================================================
create or replace function private.user_tenant_ids()
returns setof uuid
language sql
security definer
set search_path = ''
stable
as $$
  select tenant_id
  from public.tenant_members
  where user_id = (select auth.uid())
$$;

revoke all on function private.user_tenant_ids() from public;
grant execute on function private.user_tenant_ids() to authenticated;

-- ============================================================================
-- Trigger de signup: cria profile + tenant + membership numa transação.
-- SECURITY DEFINER (roda como owner → bypassa RLS). Assim a RLS já funciona
-- no primeiro request; o onboarding depois só faz UPDATE sob RLS.
-- ============================================================================
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_tenant_id uuid;
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));

  insert into public.tenants (name)
  values (coalesce(new.raw_user_meta_data ->> 'full_name', 'Meu consultório'))
  returning id into new_tenant_id;

  insert into public.tenant_members (tenant_id, user_id, role)
  values (new_tenant_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- ============================================================================
-- Trigger updated_at (padrão, aplicado às tabelas com a coluna)
-- ============================================================================
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_updated_at
before update on public.tenants
for each row execute function private.set_updated_at();

create trigger set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

-- ============================================================================
-- Row Level Security
-- ============================================================================

-- tenants: membro lê; só owner atualiza. INSERT é feito pelo trigger (definer).
alter table public.tenants enable row level security;

create policy "tenants_select" on public.tenants
for select to authenticated
using (id in (select private.user_tenant_ids()));

create policy "tenants_update" on public.tenants
for update to authenticated
using (
  id in (
    select tenant_id from public.tenant_members
    where user_id = (select auth.uid()) and role = 'owner'
  )
)
with check (
  id in (
    select tenant_id from public.tenant_members
    where user_id = (select auth.uid()) and role = 'owner'
  )
);

-- profiles: cada um vê/edita só o próprio.
alter table public.profiles enable row level security;

create policy "profiles_select" on public.profiles
for select to authenticated
using (id = (select auth.uid()));

create policy "profiles_update" on public.profiles
for update to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- tenant_members: leitura dos próprios vínculos (INSERT via trigger de signup).
alter table public.tenant_members enable row level security;

create policy "tenant_members_select" on public.tenant_members
for select to authenticated
using (user_id = (select auth.uid()));

-- ============================================================================
-- Grants (necessários: o padrão novo do Supabase não auto-expõe tabelas novas).
-- A RLS acima é o portão de linhas; estes GRANTs são o portão de tabela.
-- ============================================================================
grant select, update on public.tenants to authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.tenant_members to authenticated;

grant all on public.tenants to service_role;
grant all on public.profiles to service_role;
grant all on public.tenant_members to service_role;
