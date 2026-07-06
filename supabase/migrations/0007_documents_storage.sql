-- 0007_documents_storage — Fase 4
-- Documentos (metadados) + FK do termo de consentimento + buckets de Storage e
-- policies em storage.objects. Autoridade: 02-banco-de-dados.md (1.6, 5).

-- ============================================================================
-- documents (binário no Storage; esta tabela é a fonte de verdade de metadados)
-- ============================================================================
create table public.documents (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants (id) on delete cascade,
  student_id     uuid references public.students (id) on delete cascade,  -- NULL = doc do tenant
  kind           text not null default 'other'
                 check (kind in ('exam', 'postural_photo', 'medical_report', 'consent_form', 'other')),
  bucket         text not null default 'student-documents',
  storage_path   text not null,
  file_name      text not null,
  mime_type      text not null,
  size_bytes     bigint not null,
  taken_at       date,
  description    text,
  extracted_text text,                    -- texto p/ contexto da IA; NUNCA vetorizado (fronteira LGPD)
  uploaded_by    uuid not null references auth.users (id),
  created_at     timestamptz not null default now(),
  deleted_at     timestamptz,
  unique (bucket, storage_path)
);
create index documents_student_idx on public.documents (tenant_id, student_id);

-- FK do termo de consentimento assinado (agora que documents existe).
alter table public.students
  add constraint students_consent_document_fk
  foreign key (consent_document_id) references public.documents (id) on delete set null;

alter table public.documents enable row level security;

create policy "documents_select" on public.documents
for select to authenticated
using (tenant_id in (select private.user_tenant_ids()));
create policy "documents_insert" on public.documents
for insert to authenticated
with check (tenant_id in (select private.user_tenant_ids()));
create policy "documents_update" on public.documents
for update to authenticated
using (tenant_id in (select private.user_tenant_ids()))
with check (tenant_id in (select private.user_tenant_ids()));
create policy "documents_delete" on public.documents
for delete to authenticated
using (tenant_id in (select private.user_tenant_ids()));

grant select, insert, update, delete on public.documents to authenticated;
grant all on public.documents to service_role;

-- ============================================================================
-- Buckets de Storage (privados)
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('student-documents', 'student-documents', false, 26214400,
   array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']),
  ('avatars', 'avatars', false, 2097152,
   array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- ============================================================================
-- Policies em storage.objects
-- ============================================================================
-- student-documents: 1º segmento do path = tenant_id.
create policy "student_docs_select" on storage.objects
for select to authenticated
using (
  bucket_id = 'student-documents'
  and (storage.foldername(name))[1]::uuid in (select private.user_tenant_ids())
);
create policy "student_docs_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'student-documents'
  and (storage.foldername(name))[1]::uuid in (select private.user_tenant_ids())
);
create policy "student_docs_update" on storage.objects
for update to authenticated
using (
  bucket_id = 'student-documents'
  and (storage.foldername(name))[1]::uuid in (select private.user_tenant_ids())
)
with check (
  bucket_id = 'student-documents'
  and (storage.foldername(name))[1]::uuid in (select private.user_tenant_ids())
);
create policy "student_docs_delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'student-documents'
  and (storage.foldername(name))[1]::uuid in (select private.user_tenant_ids())
);

-- avatars: 1º segmento = user_id.
create policy "avatars_all" on storage.objects
for all to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);
