-- 0008_rag — Fase 5
-- Base de conhecimento (RAG): documentos-fonte, chunks vetorizados (HNSW + FTS
-- pt-BR), busca híbrida RRF e bucket kb-sources.
-- Autoridade: 03-rag.md + 02-banco-de-dados.md (1.8, 2.3, 5.3).

-- ============================================================================
-- kb_documents (1 linha por arquivo ingerido)
-- ============================================================================
create table public.kb_documents (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references public.tenants (id),   -- NULL = base global
  scope           text not null check (scope in ('global', 'tenant')),
  title           text not null,
  author          text,
  storage_path    text not null,
  source_type     text not null default 'pdf',
  license_note    text,
  embedding_model text,
  status          text not null default 'queued'
                  check (status in ('queued', 'processing', 'ready', 'failed')),
  total_pages     int,
  processed_pages int not null default 0,
  chunk_count     int not null default 0,
  error_message   text,
  created_by      uuid not null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint scope_tenant check (
    (scope = 'global' and tenant_id is null) or
    (scope = 'tenant' and tenant_id is not null)
  )
);
create index kb_documents_tenant_idx on public.kb_documents (tenant_id, scope);

create trigger set_updated_at
before update on public.kb_documents
for each row execute function private.set_updated_at();

alter table public.kb_documents enable row level security;

-- Leitura: global-ou-tenant. Escrita de tenant só no próprio; global via service_role.
create policy "kb_documents_select" on public.kb_documents
for select to authenticated
using (scope = 'global' or tenant_id in (select private.user_tenant_ids()));
create policy "kb_documents_insert" on public.kb_documents
for insert to authenticated
with check (scope = 'tenant' and tenant_id in (select private.user_tenant_ids()));
create policy "kb_documents_delete" on public.kb_documents
for delete to authenticated
using (scope = 'tenant' and tenant_id in (select private.user_tenant_ids()));
-- update de status/progresso é do worker (service_role); sem policy p/ authenticated.

grant select, insert, delete on public.kb_documents to authenticated;
grant all on public.kb_documents to service_role;

-- ============================================================================
-- kb_chunks (vetorizados; escrita SOMENTE via service_role no worker)
-- ============================================================================
create table public.kb_chunks (
  id             bigint generated always as identity primary key,
  document_id    uuid not null references public.kb_documents (id) on delete cascade,
  tenant_id      uuid,                                -- desnormalizado; NULL = global
  scope          text not null,
  content        text not null,
  context_header text,
  page_start     int,
  page_end       int,
  token_count    int,
  embedding      vector(1536) not null,
  fts            tsvector generated always as
                   (to_tsvector('portuguese', coalesce(context_header, '') || ' ' || content)) stored,
  created_at     timestamptz not null default now()
);
create index kb_chunks_embedding_idx on public.kb_chunks using hnsw (embedding vector_cosine_ops);
create index kb_chunks_fts_idx on public.kb_chunks using gin (fts);
create index kb_chunks_tenant_idx on public.kb_chunks (tenant_id, scope);

alter table public.kb_chunks enable row level security;

create policy "kb_chunks_select" on public.kb_chunks
for select to authenticated
using (scope = 'global' or tenant_id in (select private.user_tenant_ids()));
-- SEM policy de INSERT/UPDATE/DELETE p/ authenticated: chunks só entram via service_role.

grant select on public.kb_chunks to authenticated;
grant all on public.kb_chunks to service_role;

-- ============================================================================
-- match_kb_chunks — busca híbrida (vetor + FTS portuguese) com RRF
-- ============================================================================
create or replace function match_kb_chunks(
  query_embedding  vector(1536),
  query_text       text,
  p_tenant_id      uuid,
  match_count      int   default 8,
  rrf_k            int   default 50,
  semantic_weight  float default 1.0,
  full_text_weight float default 1.0
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
  where scope = 'global' or tenant_id = p_tenant_id
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
       coalesce(semantic_weight  / (rrf_k + s.rank), 0) +
       coalesce(full_text_weight / (rrf_k + k.rank), 0) as rrf_score
from semantic s
full outer join keyword k using (id)
join kb_chunks c on c.id = coalesce(s.id, k.id)
order by rrf_score desc
limit match_count;
$$;

revoke all on function match_kb_chunks(vector, text, uuid, int, int, float, float) from public;
grant execute on function match_kb_chunks(vector, text, uuid, int, int, float, float) to authenticated, service_role;

-- ============================================================================
-- Bucket kb-sources + policies (prefixo global/ = admin; {tenant_id}/ = tenant)
-- ============================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('kb-sources', 'kb-sources', false, 104857600, array['application/pdf'])
on conflict (id) do nothing;

create policy "kb_sources_select" on storage.objects
for select to authenticated
using (
  bucket_id = 'kb-sources'
  and (
    (storage.foldername(name))[1] = 'global'
    or (storage.foldername(name))[1]::uuid in (select private.user_tenant_ids())
  )
);
create policy "kb_sources_insert" on storage.objects
for insert to authenticated
with check (
  bucket_id = 'kb-sources'
  and (storage.foldername(name))[1] <> 'global'
  and (storage.foldername(name))[1]::uuid in (select private.user_tenant_ids())
);
create policy "kb_sources_update" on storage.objects
for update to authenticated
using (
  bucket_id = 'kb-sources'
  and (storage.foldername(name))[1] <> 'global'
  and (storage.foldername(name))[1]::uuid in (select private.user_tenant_ids())
);
create policy "kb_sources_delete" on storage.objects
for delete to authenticated
using (
  bucket_id = 'kb-sources'
  and (storage.foldername(name))[1] <> 'global'
  and (storage.foldername(name))[1]::uuid in (select private.user_tenant_ids())
);
