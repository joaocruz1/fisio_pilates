-- 0015_agenda — Agenda de aulas (agendamento)
-- Aulas AGENDADAS (futuras/planejadas). Separada de `sessions` (aula registrada,
-- que carrega exercícios e alimenta a análise de progresso). Quando um
-- agendamento é realizado, a profissional registra a aula em `sessions`.
-- Espelha o padrão de data/hora de `sessions` (data + hora, sem fuso).

create table public.appointments (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants (id) on delete cascade,
  student_id       uuid not null references public.students (id) on delete cascade,
  appointment_date date not null,
  start_time       time not null,
  duration_min     smallint not null default 50,
  status           text not null default 'scheduled'
                   check (status in ('scheduled', 'completed', 'no_show', 'cancelled')),
  notes            text,
  series_id        uuid,                       -- agrupa ocorrências de uma recorrência
  created_by       uuid not null references auth.users (id),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index appointments_tenant_date_idx on public.appointments (tenant_id, appointment_date, start_time);
create index appointments_student_idx on public.appointments (tenant_id, student_id);

create trigger set_updated_at
before update on public.appointments
for each row execute function private.set_updated_at();

alter table public.appointments enable row level security;

create policy "appointments_select" on public.appointments
for select to authenticated
using (tenant_id in (select private.user_tenant_ids()));
create policy "appointments_insert" on public.appointments
for insert to authenticated
with check (tenant_id in (select private.user_tenant_ids()));
create policy "appointments_update" on public.appointments
for update to authenticated
using (tenant_id in (select private.user_tenant_ids()))
with check (tenant_id in (select private.user_tenant_ids()));
create policy "appointments_delete" on public.appointments
for delete to authenticated
using (tenant_id in (select private.user_tenant_ids()));

grant select, insert, update, delete on public.appointments to authenticated;
grant all on public.appointments to service_role;
