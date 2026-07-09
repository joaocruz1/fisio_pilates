-- 0020_billing_policies — RLS das tabelas de billing (B8, B11, B13)
-- Padrão: leitura do próprio tenant, escrita via service_role (webhook).
-- `stripe_events` é só service_role (nenhuma policy para authenticated).

-- ============================================================================
-- subscriptions
-- ============================================================================
alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own_tenant" on public.subscriptions
  for select to authenticated
  using (tenant_id in (select private.user_tenant_ids()));

-- INSERT/UPDATE/DELETE: somente service_role (webhook handler). Nenhuma policy
-- para authenticated nessas operações — escrita exclusiva do webhook.

grant select on public.subscriptions to authenticated;
grant all    on public.subscriptions to service_role;

-- ============================================================================
-- invoices
-- ============================================================================
alter table public.invoices enable row level security;

create policy "invoices_select_own_tenant" on public.invoices
  for select to authenticated
  using (tenant_id in (select private.user_tenant_ids()));

grant select on public.invoices to authenticated;
grant all    on public.invoices to service_role;

-- ============================================================================
-- usage_records
-- ============================================================================
alter table public.usage_records enable row level security;

create policy "usage_records_select_own_tenant" on public.usage_records
  for select to authenticated
  using (tenant_id in (select private.user_tenant_ids()));

grant select on public.usage_records to authenticated;
grant all    on public.usage_records to service_role;

-- ============================================================================
-- stripe_events — SÓ service_role (idempotência de webhook)
-- ============================================================================
alter table public.stripe_events enable row level security;
-- (nenhuma policy para authenticated = 0 linhas visíveis por padrão)
grant all on public.stripe_events to service_role;

-- ============================================================================
-- UPDATE de tenants com metadados Stripe — só owner do tenant
-- ============================================================================
-- (UPDATE de plan/customer_id é FEITO PELO WEBHOOK via service_role. Pelo app,
-- a usuária não atualiza plan diretamente — só via Stripe Checkout/Portal. Por
-- isso mantemos a policy de UPDATE atual de tenants: só owner. O webhook usa
-- service_role que bypassa RLS.)

-- ============================================================================
-- Grants finais
-- ============================================================================
grant usage on schema public to authenticated;
