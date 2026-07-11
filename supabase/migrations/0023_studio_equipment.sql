-- 0023_studio_equipment — Inventário de aparelhos do estúdio (unidades físicas)
-- Cada aparelho físico do tenant = 1 linha (ex.: "Reformer 1", "Reformer 2",
-- "Cadillac", "Chair", "Solo A"). As unidades ativas viram "estações" para a
-- rotação na aula coletiva (ver dossie-coletivo + /api/ai/group-session).
-- Reaproveita o CHECK de `apparatus` do catálogo `exercises` (0005) para
-- manter um único vocabulário de aparelhos no sistema.

create table public.studio_equipment (
  id          uuid primary key default gen_random_uuid(),
  tenant_id   uuid not null references public.tenants (id) on delete cascade,
  apparatus   text not null
              check (apparatus in ('mat','reformer','cadillac','chair','barrel','accessories','other')),
  label       text not null,                 -- rótulo próprio do estúdio, ex.: "Reformer 1"
  status      text not null default 'active'
              check (status in ('active','inactive','maintenance')),
  notes       text,
  created_by  uuid not null references auth.users (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (tenant_id, label)
);
create index studio_equipment_tenant_idx on public.studio_equipment (tenant_id, status);
create index studio_equipment_apparatus_idx on public.studio_equipment (tenant_id, apparatus);

create trigger set_updated_at
before update on public.studio_equipment
for each row execute function private.set_updated_at();

alter table public.studio_equipment enable row level security;

create policy "studio_equipment_select" on public.studio_equipment
for select to authenticated
using (tenant_id in (select private.user_tenant_ids()));
create policy "studio_equipment_insert" on public.studio_equipment
for insert to authenticated
with check (tenant_id in (select private.user_tenant_ids()));
create policy "studio_equipment_update" on public.studio_equipment
for update to authenticated
using (tenant_id in (select private.user_tenant_ids()))
with check (tenant_id in (select private.user_tenant_ids()));
create policy "studio_equipment_delete" on public.studio_equipment
for delete to authenticated
using (tenant_id in (select private.user_tenant_ids()));

grant select, insert, update, delete on public.studio_equipment to authenticated;
grant all on public.studio_equipment to service_role;