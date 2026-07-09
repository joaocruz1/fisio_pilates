-- 0018_billing_core — Billing (Stripe) + Admin
-- Adiciona suporte a assinaturas Stripe, cobrança por uso (metered), pay-as-you-go,
-- e a categoria 'vitalicio' (Renata). Cria 4 tabelas novas (subscriptions, invoices,
-- usage_records, stripe_events) e estende tenants com metadados Stripe.
-- Autoridade: docs/plan-billing-admin/B1–B11, B17–B20.

-- ============================================================================
-- 1) Extensões do enum + colunas em `tenants`
-- ============================================================================
-- 'payg'      = pay-as-you-go (assinatura só com metered; B6)
-- 'vitalicio' = sem cobrança (Renata, B7)
-- 'past_due'  = sub-status financeiro (B11)
alter table public.tenants
  drop constraint tenants_plan_check,
  add constraint tenants_plan_check
    check (plan in ('free', 'pro', 'trial', 'payg', 'vitalicio'));

alter table public.tenants
  drop constraint tenants_status_check,
  add constraint tenants_status_check
    check (status in ('active', 'suspended', 'deleted', 'past_due'));

alter table public.tenants
  add column if not exists stripe_customer_id      text unique,
  add column if not exists stripe_subscription_id text,
  add column if not exists current_period_start   timestamptz,
  add column if not exists current_period_end     timestamptz,
  add column if not exists trial_ends_at          timestamptz,
  add column if not exists cancel_at_period_end   boolean not null default false,
  add column if not exists canceled_at            timestamptz;

create unique index if not exists tenants_stripe_customer_id_idx
  on public.tenants (stripe_customer_id)
  where stripe_customer_id is not null;

create index if not exists tenants_plan_status_idx
  on public.tenants (plan, status);

-- ============================================================================
-- 2) Tabela `subscriptions` — mirror local da assinatura Stripe.
--    Webhook é o ÚNICO caminho de escrita (via service_role).
-- ============================================================================
create table public.subscriptions (
  id                       uuid primary key default gen_random_uuid(),
  tenant_id                uuid not null unique references public.tenants(id) on delete cascade,
  stripe_subscription_id   text not null unique,
  stripe_customer_id       text not null,
  plan                     text not null
                           check (plan in ('free','pro','trial','payg','vitalicio')),
  status                   text not null
                           check (status in ('incomplete','incomplete_expired','trialing',
                                            'active','past_due','canceled','unpaid','paused')),
  current_period_start     timestamptz,
  current_period_end       timestamptz,
  cancel_at_period_end     boolean not null default false,
  canceled_at              timestamptz,
  trial_start              timestamptz,
  trial_end                timestamptz,
  metadata                 jsonb not null default '{}',
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);
create index subscriptions_tenant_idx on public.subscriptions (tenant_id);
create index subscriptions_status_idx on public.subscriptions (status);
create trigger set_updated_at before update on public.subscriptions
  for each row execute function private.set_updated_at();

-- ============================================================================
-- 3) Tabela `invoices` — mirror local das faturas Stripe (B8, B11).
-- ============================================================================
create table public.invoices (
  id                   uuid primary key default gen_random_uuid(),
  tenant_id            uuid not null references public.tenants(id) on delete cascade,
  stripe_invoice_id    text not null unique,
  stripe_subscription_id text,
  amount_cents         bigint not null,
  currency             text not null default 'brl',
  status               text not null
                       check (status in ('draft','open','paid','uncollectible','void')),
  hosted_invoice_url   text,
  invoice_pdf_url      text,
  period_start         timestamptz,
  period_end           timestamptz,
  paid_at              timestamptz,
  created_at           timestamptz not null default now()
);
create index invoices_tenant_idx on public.invoices (tenant_id, created_at desc);
create index invoices_status_idx on public.invoices (status);

-- ============================================================================
-- 4) Tabela `usage_records` — fila de uso metered (chat/relatório/vision).
--    Cada linha = 1 unidade que será cobrada no fim do ciclo.
-- ============================================================================
create table public.usage_records (
  id                          uuid primary key default gen_random_uuid(),
  tenant_id                   uuid not null references public.tenants(id) on delete cascade,
  subscription_id             uuid references public.subscriptions(id) on delete set null,
  kind                        text not null
                              check (kind in ('chat_message','ai_report','vision_photo')),
  quantity                    int not null default 1 check (quantity > 0),
  stripe_subscription_item_id text,
  period_start                timestamptz not null,
  period_end                  timestamptz not null,
  recorded_to_stripe          boolean not null default false,
  stripe_usage_record_id      text,
  created_at                  timestamptz not null default now()
);
create index usage_records_tenant_idx on public.usage_records (tenant_id, created_at desc);
create index usage_records_subscription_idx on public.usage_records (subscription_id, kind, period_start);
create index usage_records_pending_idx on public.usage_records (recorded_to_stripe) where recorded_to_stripe = false;

-- ============================================================================
-- 5) Tabela `stripe_events` — idempotência do webhook (B18).
-- ============================================================================
create table public.stripe_events (
  id           text primary key,                -- evt_xxx do Stripe
  type         text not null,
  api_version  text,
  payload      jsonb not null,
  processed_at timestamptz not null default now(),
  error        text
);
create index stripe_events_type_idx on public.stripe_events (type, processed_at desc);

-- ============================================================================
-- 6) Helper RLS: `private.is_admin()` (SECURITY DEFINER) — B13.
--    Retorna true se auth.uid() está em admin_users. Lê `admin_users` que
--    existirá na migration 0019; a função é criada aqui para que policies
--    possam ser escritas em 0020 referenciando-a.
-- ============================================================================
create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.admin_users where id = (select auth.uid())
  );
$$;

revoke all on function private.is_admin() from public;
grant execute on function private.is_admin() to authenticated;
