-- Teste de isolamento RLS — Fase 4 (documents + storage.objects).
-- B não acessa documento nem objeto de Storage de A; prefixo do path = tenant_id.
-- Roda via `supabase test db` (pgTAP). Ver docs/plan/09-testes-qualidade.md.

begin;

select plan(4);

insert into auth.users
  (instance_id, id, aud, role, email, encrypted_password,
   email_confirmed_at, created_at, updated_at, raw_user_meta_data)
values
  ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-00000000000a',
   'authenticated','authenticated','ana@example.com','',now(),now(),now(),'{}'::jsonb),
  ('00000000-0000-0000-0000-000000000000','00000000-0000-0000-0000-00000000000b',
   'authenticated','authenticated','bia@example.com','',now(),now(),now(),'{}'::jsonb);

set local request.jwt.claims to
  '{"sub":"00000000-0000-0000-0000-00000000000a","role":"authenticated"}';
set local role authenticated;

insert into public.students (tenant_id, full_name) select tenant_id, 'Maria' from public.tenant_members;
insert into public.documents (tenant_id, student_id, storage_path, file_name, mime_type, size_bytes, uploaded_by)
select s.tenant_id, s.id, s.tenant_id::text || '/' || s.id::text || '/doc.pdf',
       'exame.pdf', 'application/pdf', 1000, '00000000-0000-0000-0000-00000000000a'
from public.students s where full_name = 'Maria';
insert into storage.objects (bucket_id, name, owner)
select 'student-documents', tenant_id::text || '/maria/y.pdf', '00000000-0000-0000-0000-00000000000a'
from public.tenant_members;

select is((select count(*) from public.documents)::int, 1, 'A vê o próprio documento');
select is(
  (select count(*) from storage.objects where bucket_id = 'student-documents')::int, 1,
  'A vê o próprio objeto no Storage'
);
select throws_ok(
  $$ insert into storage.objects (bucket_id, name, owner)
     values ('student-documents', gen_random_uuid()::text || '/x/z.pdf',
             '00000000-0000-0000-0000-00000000000a') $$,
  '42501',
  null,
  'A não consegue gravar objeto na pasta de outro tenant'
);

reset role;
set local request.jwt.claims to
  '{"sub":"00000000-0000-0000-0000-00000000000b","role":"authenticated"}';
set local role authenticated;

select is(
  (select count(*) from public.documents)::int
    + (select count(*) from storage.objects where bucket_id = 'student-documents')::int,
  0,
  'B NÃO enxerga documento nem objeto de Storage de A'
);

reset role;
select * from finish();
rollback;
