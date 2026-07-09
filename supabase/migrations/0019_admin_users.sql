-- 0019_admin_users — Fase 9 (Billing + Admin)
-- Tabela de administradores do SaaS. Login COMPARTILHA o /login normal;
-- após autenticar, `src/server/auth.ts:requireAdmin` checa esta flag e
-- redireciona para /admin. Três roles: super_admin (CRUD de admins), support,
-- finance. RLS: SELECT do próprio id, SEM policy de insert/update/delete
-- para authenticated (B13). Tudo via service_role.

create table public.admin_users (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'support'
             check (role in ('super_admin','support','finance')),
  notes      text,                                       -- motivo / observações
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger set_updated_at before update on public.admin_users
  for each row execute function private.set_updated_at();

alter table public.admin_users enable row level security;

-- Admin vê o próprio registro (e super_admin vê todos — controlado em RSC por
-- service_role no app, nunca via policy anônima). Mantemos simples: SELECT
-- do próprio id cobre 95% dos casos. Listagem no /admin/admins usa service_role.
create policy "admin_users_select_own" on public.admin_users
  for select to authenticated
  using (id = (select auth.uid()));

-- SEM policies de INSERT/UPDATE/DELETE para authenticated. Apenas service_role
-- (usado em seed-admin.mjs e em /admin/admins CRUD) pode escrever.

-- Grants: tabela precisa ser legível para `authenticated` (a RLS filtra).
grant select on public.admin_users to authenticated;
grant all    on public.admin_users to service_role;

-- Atualiza private.is_admin() para não dar recursão: ela já lê admin_users
-- sob SECURITY DEFINER com search_path fixo, então funciona independente da
-- RLS da tabela (SECURITY DEFINER roda como owner).
