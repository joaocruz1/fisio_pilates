-- 0027_kb_student_scope — KB por aluno (scope='student')
-- Permite ingerir documentos de um aluno (ex.: anexos de avaliação) como
-- chunks vetorizados recuperáveis pelo RAG daquele aluno — usado no plano de
-- aula da turma (RAG por aluna) e no relatório/chat do aluno. O escopo
-- 'student' exige tenant_id E student_id (chunks ficam sob a mesma RLS por
-- tenant). Autoridade: 03-rag.md + 07-lgpd-seguranca.md.

-- 1) kb_documents: student_id (nullable; só preenchido em scope='student').
alter table public.kb_documents
  add column if not exists student_id uuid references public.students (id) on delete cascade;

-- 2) Reconstrói o CHECK de scope para os 3 escopos e a regra scope_tenant.
alter table public.kb_documents drop constraint if exists kb_documents_scope_check;
alter table public.kb_documents add constraint kb_documents_scope_check
  check (scope in ('global', 'tenant', 'student'));

alter table public.kb_documents drop constraint if exists scope_tenant;
alter table public.kb_documents add constraint scope_tenant check (
  (scope = 'global' and tenant_id is null and student_id is null)
  or (scope = 'tenant' and tenant_id is not null and student_id is null)
  or (scope = 'student' and tenant_id is not null and student_id is not null)
);

-- 3) kb_chunks: student_id desnormalizado (sem FK — a cascata vem via
--    kb_documents.student_id on delete cascade + kb_chunks.document_id on delete
--    cascade: apagar o aluno → apaga kb_documents → apaga kb_chunks).
alter table public.kb_chunks
  add column if not exists student_id uuid;

create index if not exists kb_chunks_student_idx
  on public.kb_chunks (tenant_id, student_id)
  where student_id is not null;

-- A policy kb_chunks_select (scope='global' or tenant_id in user_tenant_ids())
-- já protege chunks de aluno: scope='student' sempre tem tenant_id, então o
-- filtro por tenant basta. Chunks continuam sendo escritos só via service_role.

-- 4) match_kb_chunks: adiciona p_student_id (default null) para incluir chunks
--    do aluno (scope='student' and student_id = p_student_id) além de global+tenant.
--    Default null preserva chamadas existentes. Recria a assinatura (drop da
--    assinatura anterior de 8 args, criada em 0014).
drop function if exists match_kb_chunks(vector, text, uuid, int, int, float, float, float);

create or replace function match_kb_chunks(
  query_embedding  vector(1536),
  query_text       text,
  p_tenant_id      uuid,
  p_student_id     uuid default null,
  match_count      int   default 8,
  rrf_k            int   default 50,
  semantic_weight  float default 1.0,
  full_text_weight float default 1.0,
  tenant_weight    float default 1.3
)
returns table (
  id bigint, document_id uuid, content text, context_header text,
  page_start int, similarity float, rrf_score float
)
language sql stable
security invoker
set search_path = public
as $$
with scoped as (
  select * from kb_chunks
  where scope = 'global'
     or tenant_id = p_tenant_id
     or (p_student_id is not null and scope = 'student' and student_id = p_student_id)
),
semantic as (
  select id,
         row_number() over (order by embedding <=> query_embedding) as rank,
         1 - (embedding <=> query_embedding) as similarity
  from scoped
  order by embedding <=> query_embedding
  limit least(match_count * 4, 40)
),
keyword as (
  select id,
         row_number() over
           (order by ts_rank_cd(fts, websearch_to_tsquery('portuguese', query_text)) desc) as rank
  from scoped
  where fts @@ websearch_to_tsquery('portuguese', query_text)
  limit least(match_count * 4, 40)
)
select c.id, c.document_id, c.content, c.context_header, c.page_start,
       coalesce(s.similarity, 0) as similarity,
       (coalesce(semantic_weight  / (rrf_k + s.rank), 0) +
        coalesce(full_text_weight / (rrf_k + k.rank), 0))
       * (case when c.scope in ('tenant','student') then tenant_weight else 1.0 end) as rrf_score
from semantic s
full outer join keyword k using (id)
join kb_chunks c on c.id = coalesce(s.id, k.id)
order by rrf_score desc
limit match_count;
$$;

revoke all on function match_kb_chunks(vector, text, uuid, uuid, int, int, float, float, float) from public;
grant execute on function match_kb_chunks(vector, text, uuid, uuid, int, int, float, float, float)
  to authenticated, service_role;