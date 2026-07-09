-- 0014_kb_tenant_fontes — Base de conhecimento própria por tenant
-- Permite que cada profissional monte a própria base (RAG): além de PDF, aceita
-- Word/texto/imagem e LINKS (conteúdo baixado e indexado). A busca já mescla
-- global + tenant (match_kb_chunks); aqui damos um leve boost ao material do
-- próprio tenant para que, quando ela tiver base própria relevante, ele apareça
-- na frente sem soterrar a base do sistema.

-- 1) Coluna para a URL de origem (materiais do tipo 'url').
alter table public.kb_documents
  add column if not exists source_url text;

-- 2) Amplia os mimes aceitos no bucket kb-sources (antes só PDF).
update storage.buckets
set allowed_mime_types = array[
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'image/jpeg',
  'image/png',
  'image/webp'
]
where id = 'kb-sources';

-- 3) match_kb_chunks: adiciona parâmetro tenant_weight (boost do material do
--    próprio tenant). Precisa recriar a assinatura (novo parâmetro).
drop function if exists match_kb_chunks(vector, text, uuid, int, int, float, float);

create or replace function match_kb_chunks(
  query_embedding  vector(1536),
  query_text       text,
  p_tenant_id      uuid,
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
       (coalesce(semantic_weight  / (rrf_k + s.rank), 0) +
        coalesce(full_text_weight / (rrf_k + k.rank), 0))
       * (case when c.scope = 'tenant' then tenant_weight else 1.0 end) as rrf_score
from semantic s
full outer join keyword k using (id)
join kb_chunks c on c.id = coalesce(s.id, k.id)
order by rrf_score desc
limit match_count;
$$;

revoke all on function match_kb_chunks(vector, text, uuid, int, int, float, float, float) from public;
grant execute on function match_kb_chunks(vector, text, uuid, int, int, float, float, float)
  to authenticated, service_role;
