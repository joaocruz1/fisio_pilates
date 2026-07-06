# RAG — Base de Conhecimento, Ingestão e Busca Híbrida

Parte do planejamento do FisioPilates — ver `00-visao-geral.md`.

Este documento cobre o pipeline completo de RAG: ingestão de documentos → embeddings → armazenamento pgvector → retrieval híbrido → busca web complementar → consumo pelos dois casos de uso de IA (relatório de evolução e chat técnico). Schema completo e padrões de RLS estão em `02-banco-de-dados.md`; prompts, guardrails e custos de LLM em `04-ia.md`.

**Stack:** Next.js 16 (App Router) na Vercel (Fluid Compute, região `gru1`), Supabase `sa-east-1` (Postgres + pgvector + Storage + Auth), OpenRouter (LLM e embeddings), Tavily (busca web), QStash (fila de ingestão).

---

## 1. Decisões-chave (resumo executivo)

| Tema | Decisão | Justificativa curta |
|---|---|---|
| Extração de PDF | **`unpdf`** (runtime `nodejs`) | Serverless-first, zero dependências nativas — `pdf-parse` v1 depende de `pdfjs-dist`/`canvas`, que quebra na Vercel |
| Chunking | Recursivo por estrutura, **500–800 tokens**, overlap 10–15%, cabeçalho contextual | Conteúdo técnico denso; chunks médios com contexto de seção maximizam recall sem diluir precisão |
| Embeddings | **`openai/text-embedding-3-small` via `POST /v1/embeddings` do OpenRouter** (1536 dims), modelo/dimensão via env (`EMBEDDINGS_MODEL`, `EMBEDDINGS_DIM`) | Endpoint OpenAI-compatible → uma única chave/fatura; $0,02/1M tokens; bom em pt-BR; migrar para OpenAI direto = trocar 2 env vars |
| Vetores | pgvector `vector(1536)` + **índice HNSW (cosine)** | HNSW ~3x mais rápido que IVFFlat, sem retreino ao crescer a base |
| Busca | **Híbrida: vetor + FTS `portuguese` com RRF** em função SQL única (`match_kb_chunks`), SECURITY INVOKER + filtro explícito de tenant | Termos técnicos exatos (ex. "espondilolistese L5-S1") são melhor capturados por FTS; RRF combina sem tuning; RLS + filtro = defesa em profundidade |
| Re-ranking | **Não no MVP** (deixar hook) | RRF híbrido já entrega qualidade suficiente; reranker adiciona vendor, custo e latência |
| Escopo da KB | **Híbrido: base global (admin) + base por tenant**, mesma tabela com coluna `scope` + RLS via `private.user_tenant_ids()` | Isolamento garantido no banco, retrieval une os dois escopos em uma query |
| Storage | **Bucket único `kb-sources`**, prefixo `global/` (admin) vs `{tenant_id}/` (profissional), privado, signed URLs curtas | Um bucket com policy por prefixo é menos superfície que dois |
| Arquivos grandes | **QStash (Upstash)** disparando worker em API Route, **lotes de 50 páginas auto-encadeados e idempotentes** — único mecanismo de fila do produto | Fila HTTP sem infra, retries/DLQ nativos, free tier 1.000 msgs/dia; relatórios de IA são síncronos e NÃO passam por fila |
| Busca web | **Tavily** (basic search, ~$0,008/busca; 1.000 créditos/mês grátis), allowlist de domínios de saúde, cache 7 dias | Feito para RAG (retorna conteúdo limpo pronto para prompt), mais barato e simples que Exa |
| Modelo LLM | **`anthropic/claude-sonnet-5`** pinado via env `OPENROUTER_MODEL`; fallback `anthropic/claude-sonnet-4.6`; **orçar a preço cheio $3/$15 por MTok** | Nunca usar alias `latest` em produção; fallback automático via `models` no OpenRouter |
| Modelo auxiliar | `anthropic/claude-haiku-4.5` | Multi-queries do relatório e tarefas baratas/rápidas |
| Fronteira LGPD | `extracted_text` de documentos de aluno **nunca entra em `kb_chunks`** | KB é conhecimento técnico; dado de saúde de aluno vive em `documents` e é injetado direto no prompt do relatório daquele aluno |

---

## 2. Pipeline de ingestão de documentos

### 2.1 Fluxo geral

```
[UI] upload (signed URL) ──► Supabase Storage (bucket kb-sources, privado)
        │                      global/...  ou  {tenant_id}/...
        ▼
POST /api/kb/documents  ──► insert kb_documents (status='queued')
        │
        ▼
QStash.publishJSON ──► POST /api/jobs/ingest  (worker, assinatura verificada)
        │                     │
        │                     ├─ 1. baixa PDF do Storage (stream, service_role)
        │                     ├─ 2. unpdf: extrai texto página a página (lote de 50 páginas)
        │                     ├─ 3. chunking recursivo + cabeçalho contextual
        │                     ├─ 4. embeddings em lotes de até 100 chunks/request (OpenRouter)
        │                     ├─ 5. insert kb_chunks + update progresso
        │                     └─ 6. restam páginas? → re-enfileira próximo lote
        │                          senão → status='ready'
        ▼
kb_documents.status: queued → processing → ready | failed
```

- **Upload direto ao Storage via signed URL** — o arquivo nunca passa pela função serverless (evita o limite de body de 4,5 MB da Vercel). É o mesmo fluxo em 2 actions dos documentos de aluno (Fase 4): `criarUrlUpload` → PUT do browser → confirmação.
- Bucket **`kb-sources`** privado: prefixo `global/` só é gravável/legível pelo backend (service_role); prefixo `{tenant_id}/` tem policies de Storage por prefixo (a profissional grava e lê apenas o próprio prefixo — inclusive para o botão "baixar meu material"). O conteúdo da base global chega à usuária via chunks, nunca via arquivo.
- A UI (`/conhecimento`) mostra progresso lendo `kb_documents.processed_pages / total_pages` (polling ou Supabase Realtime), com estados Processando / Pronto / Erro.
- No upload, a UI exibe o aviso legal "envie apenas materiais que você possui legalmente" e permite registrar `license_note`.

### 2.2 Fila e worker — QStash com lotes auto-encadeados

**Limites relevantes (verificados):**

| Plataforma | Limite |
|---|---|
| Vercel Functions (Fluid Compute, plano Pro) | até 800s GA; o worker usa `maxDuration = 300` com folga enorme por lote |
| `waitUntil` / `after()` | roda pós-response, mas dentro do mesmo `maxDuration`, sem retry, sem observabilidade |
| Supabase Edge Functions | 400s wall clock e ~200ms de CPU ativa — inviável para parsing de PDF (CPU-bound) |
| QStash | free 1.000 msgs/dia; $1/100k depois; retries exponenciais (3x) + DLQ + assinatura |

Um livro de 300 páginas = parsing + ~250–400 chamadas de embedding em lote + ~2–4k inserts. Poderia caber numa única invocação longa, mas **não confiamos nisso** (PDFs pesados, rate limit de embeddings, cold start). Alternativas descartadas:

- **`after()`/`waitUntil` sozinho:** sem retry, sem fila, morre junto com o `maxDuration`, invisível quando falha. Ter dois caminhos de código (pequeno vs grande) para o mesmo pipeline é complexidade gratuita.
- **Supabase Edge Functions:** os 200ms de CPU ativa matam parsing + chunking.
- **Trigger.dev:** excelente para workflows longos, mas é mais uma plataforma para conta/deploy/observabilidade — overkill para um único job de ingestão num MVP de 1 dev.
- **QStash:** é só HTTP — publica mensagem, o QStash chama de volta a API Route com retry e DLQ; verificação por assinatura (`@upstash/qstash`, `verifySignatureAppRouter`); zero infra nova; free tier cobre o MVP inteiro. O worker continua sendo código Next.js normal, deployado junto. **É o único uso de fila no produto** — relatórios de IA são síncronos (ver `04-ia.md`).

**Padrão de lotes auto-encadeados** (mantém cada invocação bem abaixo do limite):

```
POST /api/jobs/ingest  { documentId, pageStart: 0 }
  ├─ processa páginas [pageStart, pageStart+50)
  ├─ update kb_documents.processed_pages
  ├─ se pageStart+50 < total_pages:
  │     qstash.publishJSON({ documentId, pageStart: pageStart+50 })
  └─ senão: status = 'ready'
```

- `export const runtime = 'nodejs'` e `export const maxDuration = 300` no route do worker.
- **Idempotência (delete-antes-de-inserir):** antes de processar um lote, `delete from kb_chunks where document_id = :id and page_start >= :pageStart and page_start < :pageStart + 50`. Assim, um retry do QStash **nunca duplica chunks**.
- Falha após os retries → mensagem vai para a DLQ do QStash + `status='failed'` com `error_message` legível em pt-BR para a UI.
- Documentos pequenos passam pelo mesmo caminho (1 lote) — **um único code path**.
- Escrita em `kb_chunks` é exclusiva do worker (client `service_role`); por isso não existe policy de escrita para usuários (ver §4).

### 2.3 Extração de texto — `unpdf`

- **`unpdf`** rodando em API Route com runtime `nodejs` (não `edge`). Motivo: zero dependências nativas — funciona na Vercel out of the box. O `pdf-parse` clássico (v1) puxa `pdfjs-dist` com dependência opcional de `canvas` (node-gyp/C++), que a Vercel não compila.
- Extrair **por página** (`extractText(pdf, { mergePages: false })`) — preserva o número da página como metadado (citação "p. 42") e permite o processamento em lotes de páginas.
- **PDFs escaneados (imagem, sem camada de texto):** fora do MVP. Detectar (texto extraído ~vazio) e marcar `status='failed'` com mensagem clara em pt-BR ("Este PDF parece ser escaneado; envie um PDF com texto selecionável"). Porta aberta: fase futura com OCR.
- Formatos aceitos no MVP: PDF. (DOCX/EPUB: fase futura via `mammoth`/conversão.)

### 2.4 Chunking — estratégia para conteúdo técnico de fisioterapia

Conteúdo típico: livros/apostilas com hierarquia forte (capítulo → seção → parágrafo), terminologia anatômica precisa, listas de exercícios, contraindicações. Estratégia:

1. **Split recursivo por estrutura** (ordem de separadores): quebras de seção/título detectadas → `\n\n` (parágrafo) → `\n` → sentença → caractere. Implementação: função própria de ~80 linhas (preferível a arrastar `@langchain/textsplitters` inteiro por um splitter).
2. **Tamanho alvo: 500–800 tokens** (~2.000–3.200 caracteres), máximo rígido 1.000 tokens. Chunks menores fragmentam protocolos de exercício; maiores diluem a similaridade de termos clínicos específicos.
3. **Overlap de 10–15%** (~80–100 tokens) para não cortar contraindicações/indicações no meio.
4. **Cabeçalho contextual (barato e eficaz):** prefixar cada chunk, *antes de embeddar*, com `"{título do documento} — {seção/capítulo} (p. {página})\n\n"`. É a versão simples do "contextual retrieval" e melhora muito o recall em livros longos onde o chunk isolado não menciona o assunto do capítulo. O cabeçalho é armazenado separado (`context_header`) — o `content` guarda só o texto do chunk.
5. Guardar `token_count` (estimado via `js-tiktoken` ou heurística chars/4) para montar orçamento de contexto no prompt.

### 2.5 Embeddings — modelo e provedor

- **Modelo: `openai/text-embedding-3-small`** — 1536 dimensões, $0,02/1M tokens; qualidade sólida em português para domínio técnico; dimensão amigável a pgvector/HNSW.
- **Provedor: OpenRouter**, via endpoint OpenAI-compatible `POST https://openrouter.ai/api/v1/embeddings` (há também `GET /v1/embeddings/models`). Uma única API key para LLM + embeddings, uma única fatura. O client é o SDK OpenAI-compatible apontando `baseURL` e key para o OpenRouter via env.
- **Plano B (mudança de 2 env vars):** como o endpoint é OpenAI-compatible, migrar para OpenAI direto é trocar `baseURL` + key. Modelo e dimensão são lidos de env (`EMBEDDINGS_MODEL`, `EMBEDDINGS_DIM`) — **nunca hardcodar 1536** no código de aplicação. Atenção: a dimensão da coluna `vector(1536)` trava o modelo; trocar de modelo exige re-embedding da base inteira (por isso `kb_documents.embedding_model` registra com qual modelo cada documento foi vetorizado, e a decisão fica travada antes da migration de `kb_chunks`).
- **Batching:** enviar até 100 chunks por request (o endpoint aceita array) — reduz round-trips e latência. Normalizar o texto (trim, colapsar espaços) antes.
- O texto embeddado é `context_header + content`.
- Alternativa avaliada e descartada no MVP: `text-embedding-3-large` ($0,13/1M, 3072 dims) — ganho marginal para o domínio não justifica 6,5x o custo + índice maior. Multilíngues dedicados (Cohere, Voyage) adicionam vendor sem necessidade comprovada; reavaliar se o retrieval em pt-BR decepcionar no golden set (§9).

---

## 3. Schema pgvector

```sql
create extension if not exists vector;

-- Documento-fonte (1 linha por arquivo ingerido)
create table kb_documents (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references tenants(id),        -- NULL = base global
  scope           text not null check (scope in ('global','tenant')),
  title           text not null,
  storage_path    text not null,                      -- caminho no bucket kb-sources
  source_type     text not null default 'pdf',
  status          text not null default 'queued'
                  check (status in ('queued','processing','ready','failed')),
  total_pages     int,
  processed_pages int not null default 0,
  error_message   text,
  embedding_model text not null default 'openai/text-embedding-3-small',
  license_note    text,                               -- declaração de posse legal do material
  created_by      uuid not null,                      -- auth.uid() de quem subiu
  created_at      timestamptz not null default now(),
  constraint scope_tenant check (
    (scope = 'global' and tenant_id is null) or
    (scope = 'tenant' and tenant_id is not null)
  )
);

-- Chunks vetorizados
create table kb_chunks (
  id             bigint generated always as identity primary key,
  document_id    uuid not null references kb_documents(id) on delete cascade,
  tenant_id      uuid,                                -- desnormalizado p/ filtro rápido; NULL = global
  scope          text not null,
  content        text not null,                       -- texto do chunk (sem o cabeçalho contextual)
  context_header text,                                -- "Livro X — Cap. Y (p. Z)"
  page_start     int,
  page_end       int,
  token_count    int,
  embedding      vector(1536) not null,               -- embed(context_header + content)
  fts            tsvector generated always as
                   (to_tsvector('portuguese',
                      coalesce(context_header,'') || ' ' || content)) stored,
  created_at     timestamptz not null default now()
);

-- Índices
create index kb_chunks_embedding_idx on kb_chunks
  using hnsw (embedding vector_cosine_ops);           -- m=16, ef_construction=64 (defaults)
create index kb_chunks_fts_idx on kb_chunks using gin (fts);
create index kb_chunks_tenant_idx on kb_chunks (tenant_id, scope);
```

Notas:

- A exclusão de um documento na UI remove os chunks em cascata (`on delete cascade`); o arquivo no Storage é removido pela mesma action.
- Compute do Supabase: o plano base aguenta dezenas de milhares de chunks 1536-d com HNSW tranquilamente; monitorar RAM se a base global passar de ~500k chunks (aí considerar `halfvec`).

### Índice vetorial: HNSW (não IVFFlat)

- **HNSW com `vector_cosine_ops`**, parâmetros default (`m=16`, `ef_construction=64`).
- Justificativa: ~3x mais rápido que IVFFlat com recall melhor, e — decisivo aqui — **não depende da distribuição dos dados no build**: a base começa vazia e cresce documento a documento; IVFFlat exigiria rebuild periódico dos centróides.
- Query-time: `set local hnsw.ef_search = 40;` dentro da função se precisar de mais recall (default 40 já é bom).

---

## 4. Escopo do conhecimento: global (admin) vs tenant

**Mesma tabela, dois escopos, isolamento por RLS.**

- `scope='global'` / `tenant_id IS NULL`: base curada pelo admin da plataforma (livros/apostilas com direito de uso, ingeridos via script admin com `service_role`). Visível a todos os tenants (somente leitura).
- `scope='tenant'` / `tenant_id=<uuid>`: materiais que cada profissional sobe. Visíveis **apenas** ao próprio tenant.
- O retrieval une os dois num único `where scope='global' or tenant_id = :tenant` (já embutido na função SQL, §5).
- **Não fechar portas:** `tenant_id` como FK está preparado para virar "estúdio/time" depois sem mudar o modelo de dados do RAG.

RLS — usa o helper padrão do projeto `private.user_tenant_ids()` (setof uuid; já suporta o futuro 1-usuária-N-tenants):

```sql
alter table kb_documents enable row level security;
alter table kb_chunks enable row level security;

create policy kb_documents_select on kb_documents for select
  using (scope = 'global' or tenant_id in (select private.user_tenant_ids()));

create policy kb_documents_insert on kb_documents for insert
  with check (scope = 'tenant' and tenant_id in (select private.user_tenant_ids()));
  -- scope='global' só via admin (service_role)

create policy kb_documents_delete on kb_documents for delete
  using (scope = 'tenant' and tenant_id in (select private.user_tenant_ids()));

create policy kb_chunks_select on kb_chunks for select
  using (scope = 'global' or tenant_id in (select private.user_tenant_ids()));
-- INSERT/UPDATE/DELETE de kb_chunks: apenas service_role (worker de ingestão);
-- sem policy de escrita para usuários.
```

### Fronteira LGPD (regra de arquitetura)

A KB é **conhecimento técnico**, nunca dado de saúde de aluno. Documentos de aluno (exames, fotos posturais, laudos) vivem em outro bucket/tabela (`student-documents` / `documents`), **não entram em `kb_chunks`** e não são vetorizados no MVP. O texto extraído deles (mesmo pipeline `unpdf`, campo `documents.extracted_text`, extração no upload) é injetado **diretamente** no prompt da análise daquele aluno (§7.1) — sob a RLS de `documents`, dentro do tenant.

Se no futuro um aluno acumular documentos demais para caber em contexto, criar tabela separada `student_doc_chunks` (tenant_id + student_id, RLS estrita) — decisão adiada de propósito e registrada no backlog pós-MVP.

---

## 5. Retrieval — busca híbrida (vetor + FTS português) com RRF

Termos clínicos exatos ("manobra de McKenzie", nomes de exercícios, "L5-S1") são onde a busca puramente semântica falha. FTS com config **`'portuguese'`** (stemming pt) + fusão por **Reciprocal Rank Fusion**, tudo numa única função SQL:

```sql
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
as $$
with scoped as (
  select * from kb_chunks
  where scope = 'global' or tenant_id = p_tenant_id
),
semantic as (
  select id, row_number() over (order by embedding <=> query_embedding) as rank,
         1 - (embedding <=> query_embedding) as similarity
  from scoped
  order by embedding <=> query_embedding
  limit least(match_count * 4, 40)
),
keyword as (
  select id, row_number() over
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
```

Notas de implementação:

- Chamada sempre **do servidor** (route handler / Server Action) com o client Supabase do usuário autenticado. A função é `stable` + **SECURITY INVOKER** — a RLS das tabelas continua valendo por baixo do filtro explícito `p_tenant_id` (**defesa em profundidade**: mesmo um bug no parâmetro não vaza chunk de outro tenant).
- `websearch_to_tsquery` tolera input livre do usuário (aspas, "-" etc.) sem injeção de tsquery.
- Retornar `similarity` separado do `rrf_score`: a similaridade coseno é o sinal usado no gatilho de fallback web (§6.2).
- Toda a camada de retrieval é encapsulada em `src/lib/ai/rag.ts` — `ragSearch(query, { tenantId, k })` embedda a query (OpenRouter), chama `match_kb_chunks` e aplica o fallback Tavily. Relatório e chat consomem **este módulo único** (testável via script/endpoint interno antes de existir UI de chat).

### Re-ranking: não no MVP

- Rerankers (Cohere Rerank ~$2/1k buscas, Voyage rerank) adicionam um vendor, ~150–400ms de latência e pouco ganho quando o híbrido RRF já roda sobre uma base curada e pequena/média.
- **Hook deixado pronto:** a camada de retrieval já produz candidatos (k×4) internamente antes do corte final — inserir um reranker ali no futuro é trocar `order by rrf_score` por uma chamada externa. Documentado como melhoria pós-MVP (plano C do risco de qualidade em pt-BR).

---

## 6. Busca web em tempo real (fallback/complemento) — Tavily

### 6.1 Provedor

| | Tavily | Exa |
|---|---|---|
| Preço | 1 crédito/busca basic ≈ **$0,008** PAYG; **1.000 créditos/mês grátis**; planos a partir de $30/mês (10k créditos ⇒ $0,003/busca) | $7/1k buscas (subiu de $5 em mar/2026), 1k/mês grátis |
| Fit | Projetado para RAG: retorna snippets limpos prontos para prompt, `include_domains`, `search_depth` | Busca neural excelente, mas orientada a descoberta/conteúdo em inglês |

Tavily ganha por preço efetivo, free tier suficiente para o MVP inteiro e resposta já formatada para consumo por LLM.

### 6.2 Quando acionar (gatilhos de fallback)

Sempre rodar o retrieval local primeiro; chamar Tavily somente se:

1. `top-1 similarity < 0.50` **ou** menos de 3 chunks com `similarity > 0.35` (base local não cobre o assunto); **ou**
2. a pergunta pede informação claramente atual ("estudos recentes", "diretriz 2026"); **ou**
3. a profissional ativa o toggle "buscar também na web" (transparência de UX).

Parâmetros: `search_depth: 'basic'`, `max_results: 5`, `include_domains` com allowlist de fontes confiáveis de saúde — `scielo.br`, `pubmed.ncbi.nlm.nih.gov`, `pedro.org.au`, `bvsalud.org` — expansível por config.

### 6.3 Cache (7 dias)

Cachear o resultado por query normalizada para poupar créditos — tabela `web_search_cache`, TTL de 7 dias na leitura:

```sql
create table web_search_cache (
  query_hash text primary key,          -- sha256 da query normalizada (lowercase, trim)
  query      text not null,
  results    jsonb not null,            -- resposta da Tavily pronta para prompt
  created_at timestamptz not null default now()
);
alter table web_search_cache enable row level security;
-- sem policies: acesso apenas server-side (service_role). O cache é global e
-- seguro de compartilhar entre tenants porque a query só contém termos técnicos.
```

Leitura ignora linhas com `created_at < now() - interval '7 days'`; limpeza oportunista no próprio acesso (ou job periódico simples).

### 6.4 Regra LGPD da query

A query enviada à Tavily é construída **apenas com termos técnicos** (patologia, exercício, objetivo) — **nunca** nome, idade ou qualquer identificador do aluno. Isso é **regra de código** (builder de query separado e testável), não convenção. É também o que torna o cache global do §6.3 seguro.

### 6.5 Combinação no prompt

```
<contexto_kb>
[KB-1] {context_header}: {content}   (fonte: {título}, p. {página})
[KB-2] ...
</contexto_kb>

<resultados_web>   <!-- presente só quando o fallback disparou -->
[WEB-1] {title} — {url}: {snippet}
</resultados_web>

Instruções: responda em pt-BR; baseie-se prioritariamente no <contexto_kb>;
use <resultados_web> apenas como complemento e sinalize com "(fonte: web)";
cite as fontes usadas como [KB-n]/[WEB-n]; se nenhuma fonte cobrir a pergunta,
diga explicitamente que não encontrou base e NÃO invente conduta clínica.
```

A UI renderiza as citações `[KB-n]` como chips clicáveis (abre o trecho/documento) e `[WEB-n]` com link externo — importante para a confiança de um público não técnico.

---

## 7. Como o RAG alimenta os dois casos de uso

Modelo em ambos: **`anthropic/claude-sonnet-5`** via OpenRouter (pinado em `OPENROUTER_MODEL`; fallback `anthropic/claude-sonnet-4.6` configurado no client), consumido com **AI SDK v6** (`ai` ^6) + `@openrouter/ai-sdk-provider` ^2. Detalhes de prompts, guardrails, quota e cache em `04-ia.md`.

### 7.1 (a) Relatório de evolução do aluno

Execução **síncrona** sob demanda (botão "Gerar análise"), em `POST /api/ai/analyses` com `maxDuration = 300` — sem fila (QStash é exclusivo da ingestão). Papel do RAG no dossiê:

1. **Coleta estruturada (sem RAG):** ficha de avaliação + anamnese, últimas N sessões (exercícios, cargas, observações), medidas/reavaliações, e `documents.extracted_text` dos documentos do aluno relevantes (selecionados pela profissional ou os M mais recentes) — injetados direto no prompt, **pseudonimizados**, nunca via `kb_chunks` (§4).
2. **Multi-query:** `claude-haiku-4.5` gera 3–5 queries de busca a partir do quadro do aluno (ex.: "progressão de carga pilates hérnia discal lombar", "contraindicações extensão torácica osteoporose"). As queries usam só termos técnicos — mesma regra LGPD do §6.4.
3. **Retrieval:** `ragSearch` por query (k=6), dedupe por `id`, corte por orçamento de ~10–12 chunks (~8k tokens). Fallback web (§6.2) por query, se disparar.
4. **Geração:** prompt = dados estruturados + contexto RAG (template §6.5) + instruções; saída **estruturada** via `generateObject` + Zod, com seções fixas (*Evolução no Pilates*, *Evolução corporal/postural*, *Pontos de atenção*, *Sugestões de progressão*, *Fontes consultadas*). Persistida em `ai_reports` (`structured jsonb`, com citações) para histórico/auditoria e cache por `input_hash`.
5. Guardar também `model`, `prompt_version` e os **ids dos chunks usados** (rastreabilidade — relevante para LGPD e para depurar qualidade de retrieval).

### 7.2 (b) Chat/assistente de dúvidas técnicas

Rota de chat com streaming (`POST /api/ai/chat`, `streamText` do AI SDK v6), com o RAG exposto como **ferramentas (tool-calling)** — nem toda mensagem precisa de busca, e o modelo formula queries de busca melhores do que o embedding da mensagem crua:

1. **`buscar_conhecimento`** — envolve `ragSearch(query, { tenantId, k: 8 })`: busca híbrida na KB (global + tenant) e devolve chunks com `context_header`, página e ids para citação `[KB-n]`.
2. **`buscar_web`** — Tavily com allowlist/cache (§6), acionada quando os gatilhos do §6.2 se aplicam ou quando o modelo julga precisar de informação atual; resultados citados como `[WEB-n]` com "(fonte: web)".
3. **`buscar_ficha_aluno`** — snapshot dos dados do aluno via RLS do tenant (não é RAG; documentada em `04-ia.md`).
4. Loop de ferramentas limitado com `stopWhen: stepCountIs(5)`; resposta em streaming com persona "colega fisioterapeuta experiente" e disclaimer permanente de que não substitui julgamento clínico.
5. Conversas persistidas por tenant em `chat_conversations` / `chat_messages` (`parts jsonb` no formato `UIMessage` do AI SDK + coluna `citations`), com RLS — o histórico hidrata o `useChat` e preserva as tool calls para replay.

---

## 8. Custos estimados (ordem de grandeza, por tenant ativo)

Orçado a **preço cheio do Sonnet 5: $3/$15 por MTok** (nunca contar com preço promocional de lançamento).

| Item | Estimativa | Custo |
|---|---|---|
| Embeddar um livro de 300 páginas (~200k tokens) | 1x por documento | **< $0,01** |
| Mensagem de chat (retrieval + ~5k in / 0,6k out) | por mensagem | ~$0,024 |
| Relatório de evolução (~15k in / 2k out) | por relatório | ~$0,075 |
| Busca web Tavily | por busca com fallback | $0,008 (free tier cobre 1.000/mês) |
| QStash | ingestão | free tier (1.000 msgs/dia) |
| Query de embedding da pergunta | por busca | desprezível |

Conclusão: o custo dominante é o LLM de geração; o RAG em si (embeddings + pgvector + Tavily) é ruído. Nenhum item exige plano pago adicional no MVP além do Vercel Pro (já decidido por uso comercial + `maxDuration`). Quota mensal por tenant e logging de custo real por operação estão em `04-ia.md`.

---

## 9. Golden set de retrieval (~15 perguntas) — teste de qualidade

Teste de regressão da qualidade do retrieval, criado na Fase 5 junto com a ingestão dos 2–3 materiais seed da base global e rodado como suíte de qualidade (script Vitest dedicado, ex. `npm run test:retrieval`, contra o banco local/staging com a base seed ingerida).

**Formato:** arquivo versionado (ex. `tests/retrieval/golden-set.json`) com ~15 entradas:

```json
{
  "question": "Quais as contraindicações de extensão torácica para osteoporose?",
  "expect": { "documentTitle": "…", "pageRange": [120, 135] }
}
```

**Execução:** para cada pergunta, embeddar a query → `match_kb_chunks(k=8)` → **passa** se algum chunk retornado pertence ao documento/faixa de páginas esperada. Registrar também a `similarity` top-1 de cada pergunta (serve para calibrar o limiar de fallback de 0.50 do §6.2).

**Critério de aceite (Fase 5):** ≥ 80% do golden set correto (≥ 12/15). Se falhar: revisar chunking/cabeçalho contextual primeiro; plano B escalonado: `text-embedding-3-large` → reranker (hook do §5).

**Composição sugerida** (as perguntas finais devem ser ajustadas ao conteúdo real dos materiais seed) — cobrir deliberadamente os quatro modos de acerto/falha:

| # | Pergunta (exemplo) | O que testa |
|---|---|---|
| 1 | "O que é a manobra de McKenzie e quando aplicar?" | Termo exato → força do FTS |
| 2 | "Espondilolistese L5-S1: quais exercícios evitar?" | Termo clínico + nomenclatura vertebral (FTS) |
| 3 | "Pilates para gestantes: contraindicações no primeiro trimestre" | Semântica direta |
| 4 | "Como progredir a carga de molas com hérnia discal lombar?" | Paráfrase semântica (vetor) |
| 5 | "Exercícios de estabilização de core para dor lombar crônica" | Semântica ampla, múltiplos capítulos |
| 6 | "Contraindicações de extensão torácica em osteoporose" | Combinação FTS + vetor |
| 7 | "Diferença entre anteversão e retroversão pélvica" | Conceito definido em seção específica |
| 8 | "O que avaliar no teste de Adams?" | Termo exato raro |
| 9 | "Escoliose estrutural vs postural: como diferenciar?" | Conceito comparativo |
| 10 | "Ajustes do reformer para aluna com estenose de canal lombar" | Equipamento + patologia (cross-section) |
| 11 | "Princípios de respiração no método Pilates" | Fundamento do método (recall em livro longo) |
| 12 | "Fortalecimento do assoalho pélvico no pós-parto" | Semântica, vocabulário leigo vs técnico |
| 13 | "Síndrome do impacto do ombro: exercícios seguros" | Patologia de membro superior |
| 14 | "Osteoartrose de joelho: molas leves ou pesadas?" | Pergunta prática, resposta distribuída |
| 15 | "Qual a diretriz mais recente para lombalgia inespecífica?" | **Caso negativo**: base não cobre → similarity baixa deve disparar o fallback web (§6.2) |

O item 15 valida o gatilho de fallback, não o acerto de chunk. Além do golden set, o teste de isolamento é obrigatório: chunk de tenant A **nunca** aparece em busca do tenant B (teste automatizado com dois tenants seed).

---

## 10. Variáveis de ambiente

```
OPENROUTER_API_KEY=
OPENROUTER_MODEL=anthropic/claude-sonnet-5
OPENROUTER_FALLBACK_MODEL=anthropic/claude-sonnet-4.6   # aplicado via models no client
OPENROUTER_FAST_MODEL=anthropic/claude-haiku-4.5
EMBEDDINGS_MODEL=openai/text-embedding-3-small
EMBEDDINGS_DIM=1536
TAVILY_API_KEY=
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=
SUPABASE_URL= / SUPABASE_ANON_KEY= / SUPABASE_SERVICE_ROLE_KEY=   # worker de ingestão usa service_role
```

Todas validadas em `lib/env.ts` (zod) e presentes no `.env.example`.

---

## 11. Riscos e portas abertas

- **PDF escaneado sem texto** → falha explícita no MVP; OCR em fase futura.
- **Troca de modelo de embedding** → exige re-embedding total; mitigado por `kb_documents.embedding_model` + dimensão via env; decisão travada antes da migration de `kb_chunks`.
- **Base global > ~500k chunks** → avaliar `halfvec(1536)` + upgrade de compute do Supabase.
- **Qualidade de retrieval em pt-BR insatisfatória** → detectada pelo golden set (§9); plano B: `text-embedding-3-large` ou embedding multilíngue dedicado; plano C: reranker (hook já previsto no §5).
- **Muitos documentos por aluno** → criar `student_doc_chunks` (tenant_id + student_id, RLS estrita) — decisão adiada de propósito (§4).
- **Times/estúdios no futuro** → modelo `tenant_id` + `scope` (e o helper `private.user_tenant_ids()` retornando setof) já comporta um nível de agrupamento acima sem migração destrutiva.

## Referências

- OpenRouter: [Claude Sonnet 5](https://openrouter.ai/anthropic/claude-sonnet-5), [Claude Sonnet 4.6](https://openrouter.ai/anthropic/claude-sonnet-4.6), [Embeddings API](https://openrouter.ai/docs/api/reference/embeddings), [lista de modelos de embedding](https://openrouter.ai/docs/api/api-reference/embeddings/list-embeddings-models)
- OpenAI: [pricing embeddings](https://developers.openai.com/api/docs/pricing), [text-embedding-3-small](https://developers.openai.com/api/docs/models/text-embedding-3-small)
- Supabase: [pgvector](https://supabase.com/docs/guides/database/extensions/pgvector), [HNSW](https://supabase.com/docs/guides/ai/vector-indexes/hnsw-indexes), [Hybrid search](https://supabase.com/docs/guides/ai/hybrid-search), [HNSW performance](https://supabase.com/blog/increase-performance-pgvector-hnsw), [Edge Functions limits](https://supabase.com/docs/guides/functions/limits)
- Vercel: [duration](https://vercel.com/docs/functions/configuring-functions/duration), [fluid compute](https://vercel.com/docs/fluid-compute), [limits](https://vercel.com/docs/functions/limitations)
- PDF em serverless: [unpdf (GitHub)](https://github.com/unjs/unpdf), [unpdf vs pdf-parse na Vercel](https://chudi.dev/blog/serverless-pdf-processing-unpdf-vs-pdfparse)
- Web search: [Tavily credits & pricing](https://docs.tavily.com/documentation/api-credits), [Exa pricing](https://exa.ai/pricing)
- Fila: [QStash pricing](https://upstash.com/pricing/qstash)
- RRF/híbrido: [pgvector + FTS com RRF](https://dev.to/lpossamai/building-hybrid-search-for-rag-combining-pgvector-and-full-text-search-with-reciprocal-rank-fusion-6nk)
