-- 0019_admin_users_rls_test — Admin vê só o próprio registro; sem auto-promoção.
do $$
declare
  uid_super uuid := gen_random_uuid();
  uid_normal uuid := gen_random_uuid();
begin
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at)
    values (uid_super, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'super@test.local', '', now()),
           (uid_normal, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'normal@test.local', '', now());

  -- service_role cria os admins.
  set local role service_role;
  insert into public.admin_users (id, role) values
    (uid_super, 'super_admin'),
    (uid_normal, 'support');

  -- Troca para o normal: vê só a si próprio.
  set local role authenticated;
  perform set_config('request.jwt.claim.sub', uid_normal::text, true);
  assert (select count(*) from public.admin_users) = 1, 'Admin normal deve ver só a si próprio';
  assert (select count(*) from public.admin_users where id = uid_super) = 0, 'Não deve ver outros admins';

  -- Tentativa de auto-promoção deve falhar (sem policy de UPDATE).
  update public.admin_users set role = 'super_admin' where id = uid_normal;
  assert (select role from public.admin_users where id = uid_normal) = 'support', 'UPDATE bloqueado por RLS';

  -- Tentativa de inserir um novo admin pela authenticated deve falhar.
  begin
    insert into public.admin_users (id, role) values (gen_random_uuid(), 'super_admin');
    assert false, 'INSERT de admin por authenticated deveria falhar';
  exception
    when others then
      -- esperado: new row violates row-level security policy
      null;
  end;

  -- Limpeza via service_role
  set local role service_role;
  delete from public.admin_users where id in (uid_super, uid_normal);
  delete from auth.users where id in (uid_super, uid_normal);
end $$;
