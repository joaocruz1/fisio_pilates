-- 0026_documents_assessment_fk — Anexos de avaliação + ponte com a KB do aluno
-- 1) documents.assessment_id: vínculo opcional de um documento a uma avaliação
--    (anexos de PDF/Word na avaliação). on delete set null preserva o documento
--    (que ainda pertence ao aluno) caso a avaliação seja apagada.
-- 2) documents.kb_document_id: vínculo de volta à linha de kb_documents criada
--    pela ingestão do conteúdo do documento na KB por aluno (scope='student').
--    Permite limpar chunks em cascata quando o documento é excluído.
-- 3) Atualiza o bucket student-documents para aceitar Word/txt (ALLOWED_DOC_MIMES
--    já aceita, mas o Storage rejeita). Autoridade: 02-banco-de-dados.md.

alter table public.documents
  add column if not exists assessment_id uuid references public.assessments (id) on delete set null,
  add column if not exists kb_document_id uuid references public.kb_documents (id) on delete set null;

create index if not exists documents_assessment_idx
  on public.documents (tenant_id, assessment_id)
  where assessment_id is not null;

-- Agora o texto extraído de documentos de aluno PODE ser vetorizado na KB por
-- aluno (decisão do produto: anexos de avaliação alimentam o RAG do aluno,
-- sob RLS do mesmo tenant; a query RAG usa só termos técnicos e a injeção no
-- prompt é por pseudônimo — ver docs/plan/07-lgpd-seguranca.md).
comment on column public.documents.extracted_text is
  'Texto extraído do arquivo; alimentado na KB por aluno (kb_chunks scope=student) quando o documento pertence a um aluno. Fronteira LGPD: RLS por tenant; query só com termos técnicos.';

-- Bucket student-documents: amplia os mimes aceitos (antes só pdf/jpeg/png/webp).
update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
]
where id = 'student-documents';