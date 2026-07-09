-- 0018_billing_rls_test — Verifica isolamento de tenant em subscriptions/invoices/usage_records.
-- Assumimos 2 tenants: tA e tB, ambos com auth.users e tenant_members já criados.
-- Reaproveita o template de tests existente (0002_tenancy_rls_test.sql).

-- Setup mínimo: cria 2 usuárias e 2 tenants.
do $$
declare
  uid_a uuid := gen_random_uuid();
  uid_b uuid := gen_random_uuid();
  ta uuid := gen_random_uuid();
  tb uuid := gen_random_uuid();
  sub_id uuid := gen_random_uuid();
begin
  -- Cria usuários em auth.users (apenas schema test).
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at)
    values (uid_a, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'a-billing-rls@test.local', '', now()),
           (uid_b, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'b-billing-rls@test.local', '', now());

  insert into public.tenants (id, name) values (ta, 'A'), (tb, 'B');
  insert into public.tenant_members (tenant_id, user_id, role) values
    (ta, uid_a, 'owner'), (tb, uid_b, 'owner');

  insert into public.subscriptions (id, tenant_id, stripe_subscription_id, stripe_customer_id, plan, status)
    values (sub_id, ta, 'sub_test_a', 'cus_test_a', 'essencial', 'active');

  insert into public.invoices (tenant_id, stripe_invoice_id, amount_cents, status)
    values (ta, 'in_test_a', 4900, 'paid');

  insert into public.usage_records (tenant_id, subscription_id, kind, quantity, period_start, period_end)
    values (ta, sub_id, 'chat_message', 1, now(), now() + interval '30 days');

  -- Troca para uid_a: A vê; B não vê.
  perform set_config('request.jwt.claim.sub', uid_a::text, true);
  set local role authenticated;
  assert (select count(*) from public.subscriptions) = 1, 'A deve ver 1 subscription';
  assert (select count(*) from public.invoices) = 1, 'A deve ver 1 invoice';
  assert (select count(*) from public.usage_records) = 1, 'A deve ver 1 usage_record';

  perform set_config('request.jwt.claim.sub', uid_b::text, true);
  assert (select count(*) from public.subscriptions) = 0, 'B NÃO deve ver subscriptions de A';
  assert (select count(*) from public.invoices) = 0, 'B NÃO deve ver invoices de A';
  assert (select count(*) from public.usage_records) = 0, 'B NÃO deve ver usage_records de A';

  reset role;
  -- Limpeza
  delete from public.usage_records where tenant_id = ta;
  delete from public.invoices where tenant_id = ta;
  delete from public.subscriptions where tenant_id = ta;
  delete from public.tenant_members where user_id in (uid_a, uid_b);
  delete from public.tenants where id in (ta, tb);
  delete from auth.users where id in (uid_a, uid_b);
end $$;
