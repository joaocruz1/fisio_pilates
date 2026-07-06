# 03 — RAG: Ingestão, Retrieval Híbrido e Busca Web

Parte do planejamento do FisioPilates — ver `00-visao-geral.md`.

> Escopo: base de conhecimento técnico (KB) do produto — pipeline de ingestão de PDFs (upload → QStash → worker → chunking → embeddings → pgvector), busca híbrida vetor+FTS com RRF, escopo global vs. tenant, busca web complementar (Tavily) e como o retrieval alimenta os dois casos de uso de IA (relatório de evolução e chat). Schema/RLS detalhados em `02-banco-de-dados.md`; integração AI SDK/OpenRouter, prompts e custos de geração em `04-ia.md`; background jobs/infra em `06-infra-deploy.md`; golden set e testes em `09-testes-qualidade.md`.
>
> **Fronteira LGPD (regra de arquitetura, não convenção):** a KB é **conhecimento técnico** (livros, apostilas, protocolos). Documento de aluno (exame, foto postural, laudo) **nunca** entra em `kb_chunks` e não é vetorizado no MVP. O `extracted_text` desses documentos vive em `documents.extracted_text` e é injetado direto no prompt daquele aluno (ver `04-ia.md`). Misturar as duas coisas seria vazar dado de saúde para a base compartilhada.

---

## 1. Decisões-chave

| Tema | Decisão | Justificativa curta |
|---|---|---|
| Extração de PDF | **`unpdf`** (runtime `nodejs`) | Serverless-first, zero dependências nativas — `pdf-parse` v1 puxa `pdfjs-dist`/`canvas` (node-gyp/C++), que não compila na Vercel. Mesma lib usada na extração de documentos de aluno (Fase 4). |
| Chunking | Recursivo por estrutura, **500–800 tokens**, overlap 10–15%, com cabeçalho contextual | Conteúdo técnico denso; chunks médios com contexto de seção maximizam recall sem diluir a precisão de termos clínicos. |
| Embeddings | **`openai/text-embedding-3-small` via `POST /v1/embeddings` do OpenRouter** (1536 dims) | O OpenRouter expõe endpoint de embeddings OpenAI-compatível → **uma única chave/fatura** para LLM + embeddings; ~$0,02/1M tokens; bom em pt-BR. |
| Vetores | pgvector `vector(1536)` + **índice HNSW (cosine)** | HNSW ~3x mais rápido que IVFFlat e sem retreino ao crescer a base documento a documento. |
| Busca | **Híbrida: vetor + FTS `portuguese` com RRF** numa função SQL única (`match_kb_chunks`) | Termos técnicos exatos ("espondilolistese L5-S1") são melhor capturados por FTS; RRF combina os dois sem tuning. |
| Re-ranking | **Não no MVP** (hook deixado no código) | O híbrido RRF sobre base curada já entrega qualidade suficiente; reranker adiciona vendor, custo e latência. |
| Escopo da KB | **Base global (admin) + base por tenant**, mesma tabela, coluna `scope` + RLS | Isolamento no banco; o retrieval une os dois escopos numa única query. |
| Arquivos grandes | **QStash** disparando worker em API Route, **lotes de 50 páginas auto-encadeados e idempotentes** | Fila HTTP sem infra, retries/DLQ nativos, free tier cobre o MVP. QStash é o **único** mecanismo de fila do produto — relatórios são síncronos (ver `04-ia.md`). |
| Busca web | **Tavily** (basic, allowlist de domínios de saúde, cache 7 dias) | Feito para RAG (retorna conteúdo limpo pronto p/ prompt), mais barato que Exa, free tier cobre o MVP. |
| Modelo LLM (consumidores do RAG) | **`anthropic/claude-sonnet-5`** pinado via env `OPENROUTER_MODEL` (fallback `anthropic/claude-sonnet-4.6`) | Contrato com `04-ia.md`; nunca usar alias `latest`. |
| Modelo auxiliar | **`anthropic/claude-haiku-4.5`** | Multi-query (relatório) e reescrita de query (chat) — barato/rápido. |

### 1.1 Variáveis de ambiente do RAG

Validadas por zod em `lib/env.ts` (ver `06-infra-deploy.md`); nunca hardcodar dimensão ou modelo.

```bash
OPENROUTER_API_KEY=
OPENROUTER_MODEL=anthropic/claude-sonnet-5          # LLM consumidor (contrato com 04-ia.md)
EMBEDDINGS_MODEL=openai/text-embedding-3-small
EMBEDDINGS_DIM=1536
TAVILY_API_KEY=
QSTASH_TOKEN=
QSTASH_CURRENT_SIGNING_KEY=
QSTASH_NEXT_SIGNING_KEY=
# Worker de ingestão usa service role:
NEXT_PUBLIC_SUPABASE_URL= / SUPABASE_SERVICE_ROLE_KEY=
```

O modelo auxiliar (Haiku) e o de fallback são resolvidos no `lib/ai/client.ts` a partir do mesmo provider — ver `04-ia.md`. Trocar de provedor de embeddings (OpenRouter → OpenAI direto) é mudar `baseURL` + key, pois o endpoint é OpenAI-compatível; trocar de **modelo** de embedding exige re-embeddar a base inteira (a dimensão da coluna trava o modelo) — por isso `EMBEDDINGS_MODEL`/`EMBEDDINGS_DIM` vêm de env e há coluna `embedding_model` em `kb_documents`.

---

## 2. Pipeline de ingestão

### 2.1 Fluxo geral

```
[UI /conhecimento]
  criarUrlUpload (server action) ──► signed upload URL
        │
        ▼
  PUT direto do browser ──────────► Supabase Storage  (bucket kb-sources, prefixo global/ ou {tenant_id}/)
        │                            (arquivo NUNCA passa pela função serverless — evita limite de 4,5 MB da Vercel)
        ▼
  confirmarUpload (server action) ─► INSERT kb_documents (status='queued')
        │                            └─► qstash.publishJSON → POST /api/jobs/ingest { documentId, pageStart: 0 }
        ▼
POST /api/jobs/ingest  (worker; assinatura QStash verificada; runtime nodejs; maxDuration=300)
        │
        ├─ 1. baixa o PDF do Storage (service role, stream)
        ├─ 2. delete-antes-de-inserir (idempotência) do lote atual
        ├─ 3. unpdf: extrai texto das páginas [pageStart, pageStart+50)
        ├─ 4. chunking recursivo 500–800 tokens + cabeçalho contextual
        ├─ 5. embeddings em lote (≤100 chunks/request, OpenRouter)
        ├─ 6. INSERT kb_chunks + UPDATE kb_documents.processed_pages
        └─ 7. restam páginas? → qstash.publishJSON próximo lote (pageStart+50)
                 senão → status='ready'
        ▼
kb_documents.status:  queued → processing → ready | failed
```

Estados observados pela UI via polling de `processed_pages / total_pages` (barra de progresso "Processando").

### 2.2 Upload por signed URL

Mesmo fluxo de duas actions dos documentos de aluno (Fase 4) — reaproveitado aqui:

1. **`criarUrlUpload`** — valida tipo (PDF) e tamanho, resolve o prefixo do bucket a partir do escopo (`global/` só para admin; `{tenant_id}/` para o tenant, com `tenant_id` vindo da sessão, **nunca do form**), gera uma signed upload URL curta.
2. **PUT direto do browser** para o Storage, com barra de progresso (o arquivo não trafega pela serverless).
3. **`confirmarUpload`** — grava a linha em `kb_documents` (`status='queued'`, `storage_path`, `title`, `license_note`), e publica a primeira mensagem no QStash.

Bucket `kb-sources` é **privado**; policies por prefixo em `storage.objects` (detalhe em `02-banco-de-dados.md`). O conteúdo chega ao usuário via **chunks**, não via download do arquivo — exceto o botão "baixar meu material" do próprio dono (signed URL curta).

### 2.3 Extração de texto — `unpdf`

- Roda em API Route com `export const runtime = 'nodejs'` (não `edge`). Zero dependências nativas — funciona na Vercel out of the box.
- Extrair **por página** (`extractText(pdf, { mergePages: false })`): preserva o número da página como metadado (citação "p. 42") e permite o processamento em lotes.
- **PDF escaneado (imagem, sem camada de texto):** fora do MVP. Detectar (texto extraído ~vazio no lote) → `status='failed'` + `error_message` em pt-BR: *"Este PDF parece ser escaneado; envie um PDF com texto selecionável."* Porta aberta: OCR em fase futura.
- Formato aceito no MVP: **PDF**. DOCX/EPUB ficam para depois.

### 2.4 Chunking — estratégia para conteúdo técnico

Conteúdo típico: livros/apostilas com hierarquia forte (capítulo → seção → parágrafo), terminologia anatômica precisa, listas de exercícios, contraindicações.

1. **Split recursivo por estrutura** — ordem de separadores: quebras de seção/título → `\n\n` (parágrafo) → `\n` → sentença → caractere. Preferir uma **função própria (~80 linhas)** a arrastar `@langchain/textsplitters` inteiro.
2. **Tamanho alvo 500–800 tokens** (~2.000–3.200 caracteres), máximo rígido 1.000 tokens. Menores fragmentam protocolos de exercício; maiores diluem a similaridade de termos clínicos.
3. **Overlap 10–15%** (~80–100 tokens) para não cortar contraindicações/indicações no meio.
4. **Cabeçalho contextual** (barato e eficaz): prefixar cada chunk **antes de embeddar** com `"{título do documento} — {seção/capítulo} (p. {página})\n\n"`. É a versão simples do "contextual retrieval" e eleva muito o recall em livros longos onde o chunk isolado não menciona o assunto do capítulo. Guardado em `context_header` e concatenado ao `content` também no `fts` e no vetor.
5. Guardar `token_count` (estimado via `js-tiktoken` ou heurística `chars/4`) para orçar o contexto do prompt.

### 2.5 Embeddings

- **`openai/text-embedding-3-small`**, 1536 dims, ~$0,02/1M tokens; boa qualidade em português técnico; dimensão amigável ao HNSW.
- **Provedor OpenRouter**, endpoint `POST https://openrouter.ai/api/v1/embeddings` (OpenAI-compatível) → **uma única chave** para LLM + embeddings.
- **Batching:** até **100 chunks por request** (o endpoint aceita array); normalizar o texto (trim, colapsar espaços) antes de enviar.
- O vetor é `embed(context_header + "\n\n" + content)` — o cabeçalho entra no embedding, não só no texto exibido.
- Descartados no MVP: `text-embedding-3-large` (6,5x o custo p/ ganho marginal no domínio) e multilíngues dedicados (Cohere/Voyage — vendor sem necessidade comprovada). Reavaliar só se o retrieval em pt-BR decepcionar no golden set (§8).

### 2.6 Background: QStash + lotes auto-encadeados

QStash é o mecanismo de fila **único** do produto (relatórios são síncronos — ver `04-ia.md`), por motivos práticos que descartam as alternativas:

- **`after()`/`waitUntil` sozinho:** sem retry, sem fila, morre junto com o `maxDuration`, invisível quando falha. Ter dois code paths para o mesmo pipeline é complexidade gratuita. Descartado como mecanismo principal.
- **Supabase Edge Functions:** ~200ms de CPU ativa não cobrem parsing de PDF + chunking (CPU-bound). Descartado.
- **Trigger.dev:** ótimo, mas é mais uma plataforma (conta/deploy/observabilidade) — overkill para um único job num MVP tocado por 1 dev.
- **QStash:** é só HTTP — publica a mensagem, o QStash chama de volta a API Route com retry exponencial e DLQ; assinatura verificada por `@upstash/qstash` (`verifySignatureAppRouter`); zero infra nova; free tier de 1.000 msgs/dia cobre o MVP.

**Padrão de lotes** (mantém cada invocação muito abaixo do limite):

```
POST /api/jobs/ingest  { documentId, pageStart }
  ├─ processa páginas [pageStart, pageStart+50)
  ├─ UPDATE kb_documents.processed_pages
  ├─ se pageStart+50 < total_pages:
  │     qstash.publishJSON({ documentId, pageStart: pageStart+50 })
  └─ senão: status = 'ready'
```

- `export const maxDuration = 300` no route do worker (margem enorme para 50 páginas).
- **Idempotência (delete-antes-de-inserir):** antes de inserir o lote, `delete from kb_chunks where document_id = :documentId and page_start >= :pageStart and page_start < :pageStart + 50`. Um retry do QStash reprocessa o lote e **nunca duplica chunks**.
- Falha após todos os retries → DLQ do QStash + `status='failed'` com `error_message` legível na UI.
- Documento pequeno passa pelo **mesmo caminho** (1 lote) — um único code path.

Um livro de 300 páginas = parsing + ~250–400 chamadas de embedding em lote + ~2–4k inserts, dividido em ~6 lotes de 50 páginas, cada um bem abaixo dos 300s. O produto roda em Vercel Pro (ver `06-infra-deploy.md`), que entrega `maxDuration` folgado; ainda assim os lotes garantem que nenhuma invocação chegue perto do teto.

---

## 3. Schema pgvector e busca híbrida

Schema resumido aqui para contexto do retrieval; a versão canônica com todas as policies vive em `02-banco-de-dados.md`. PK dos chunks é `bigint identity`; `fts` é coluna gerada `tsvector`.

### 3.1 Tabelas e índices

```sql
create extension if not exists vector;

-- Documento-fonte (1 linha por arquivo ingerido)
create table kb_documents (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references tenants(id),          -- NULL = base global
  scope           text not null check (scope in ('global','tenant')),
  title           text not null,
  storage_path    text not null,                        -- caminho no bucket kb-sources
  source_type     text not null default 'pdf',
  license_note    text,                                 -- "material que possuo legalmente"
  embedding_model text,                                 -- modelo usado (destrava troca futura); ver versão canônica em 02-banco-de-dados.md
  status          text not null default 'queued'
                  check (status in ('queued','processing','ready','failed')),
  total_pages     int,
  processed_pages int not null default 0,
  error_message   text,
  created_by      uuid not null,                        -- auth.uid() de quem subiu
  created_at      timestamptz not null default now(),
  constraint scope_tenant check (
    (scope = 'global' and tenant_id is null) or
    (scope = 'tenant'  and tenant_id is not null)
  )
);

-- Chunks vetorizados
create table kb_chunks (
  id             bigint generated always as identity primary key,
  document_id    uuid not null references kb_documents(id) on delete cascade,
  tenant_id      uuid,                                  -- desnormalizado p/ filtro rápido; NULL = global
  scope          text not null,
  content        text not null,                         -- texto do chunk (sem o cabeçalho)
  context_header text,                                  -- "Livro X — Cap. Y (p. Z)"
  page_start     int,
  page_end       int,
  token_count    int,
  embedding      vector(1536) not null,                 -- embed(context_header + content)
  fts            tsvector generated always as
                   (to_tsvector('portuguese',
                      coalesce(context_header,'') || ' ' || content)) stored,
  created_at     timestamptz not null default now()
);

-- Índices
create index kb_chunks_embedding_idx on kb_chunks
  using hnsw (embedding vector_cosine_ops);             -- m=16, ef_construction=64 (defaults)
create index kb_chunks_fts_idx    on kb_chunks using gin (fts);
create index kb_chunks_tenant_idx on kb_chunks (tenant_id, scope);
```

**Índice vetorial — HNSW (não IVFFlat):** `vector_cosine_ops`, defaults `m=16`, `ef_construction=64`. ~3x mais rápido que IVFFlat com recall melhor e — decisivo aqui — **não depende da distribuição dos dados no build**: a base começa vazia e cresce documento a documento; IVFFlat exigiria rebuild periódico dos centróides. Query-time: `set local hnsw.ef_search = 40` dentro da função se precisar de mais recall (40 já é bom).

**Compute:** o plano base do Supabase (sa-east-1) aguenta dezenas de milhares de chunks 1536-d com HNSW tranquilamente. Monitorar RAM se a base global passar de ~500k chunks — aí avaliar `halfvec(1536)` + upgrade de compute.

### 3.2 Função `match_kb_chunks` (busca híbrida RRF — SQL completo)

FTS com config **`portuguese`** (stemming pt) + fusão por **Reciprocal Rank Fusion**. `security invoker` + filtro explícito de tenant (defesa em profundidade: a RLS das tabelas continua valendo mesmo com o filtro `p_tenant_id`).

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
```

Notas de implementação:

- Chamada **sempre do servidor** (route handler / server action) com o client Supabase do usuário autenticado — como a função é `stable`/invoker, a RLS das tabelas segue valendo além do filtro `p_tenant_id`.
- `websearch_to_tsquery` tolera input livre do usuário (aspas, `-` etc.) sem risco de tsquery injection.
- `similarity` é retornado **separado** do `rrf_score` porque a similaridade coseno do top-1 é o sinal do gatilho de fallback web (§5).
- O corte interno de `match_count * 4` candidatos (antes do `limit match_count`) é o **hook do reranker** (§3.3).

### 3.3 Re-ranking — não no MVP, hook deixado

Rerankers (Cohere Rerank ~$2/1k, Voyage) adicionam vendor, ~150–400ms de latência e pouco ganho quando o híbrido RRF roda sobre base curada pequena/média. A função já materializa `k×4` candidatos antes do corte final — inserir um reranker no futuro é trocar `order by rrf_score` por uma chamada externa sobre esses candidatos. Documentado como melhoria pós-MVP.

---

## 4. Escopo do conhecimento: global vs. tenant

**Mesma tabela, dois escopos, isolamento por RLS.**

- `scope='global'` / `tenant_id IS NULL`: base curada pelo admin da plataforma (livros/apostilas com direito de uso). **Somente leitura**, visível a todos os tenants.
- `scope='tenant'` / `tenant_id=<uuid>`: materiais que cada profissional sobe — visíveis **apenas** ao próprio tenant.
- O retrieval une os dois num único `where scope='global' or tenant_id = :tenant` (já embutido em `match_kb_chunks`).

RLS (esqueleto; usa o helper `private.user_tenant_ids()` que retorna `setof uuid` — mesmo padrão de todas as tabelas, ver `02-banco-de-dados.md`):

```sql
alter table kb_chunks enable row level security;
create policy kb_chunks_select on kb_chunks for select
  using (scope = 'global' or tenant_id in (select private.user_tenant_ids()));
-- INSERT/DELETE de chunks: só service role (worker de ingestão). Sem policy de escrita para usuários.

alter table kb_documents enable row level security;
create policy kb_documents_select on kb_documents for select
  using (scope = 'global' or tenant_id in (select private.user_tenant_ids()));
create policy kb_documents_insert on kb_documents for insert
  with check (scope = 'tenant' and tenant_id in (select private.user_tenant_ids()));
-- scope='global' só via admin (service role).
```

- **Storage:** bucket único `kb-sources` com policy por prefixo — `global/` legível só pelo backend; `{tenant_id}/` só pelo dono. Conteúdo chega ao usuário via chunks, não via arquivo.
- **Escrita de chunks só service role:** o worker `/api/jobs/ingest` usa o client admin. Ingestão da base global é feita por um **script admin** (service role) com os 2–3 materiais seed.
- `tenant_id` como FK já comporta virar "estúdio/time" depois, sem migração destrutiva do modelo de RAG.

**Fronteira LGPD (repetida por ser crítica):** documento de aluno **não entra em `kb_chunks`** e não é vetorizado no MVP. Seu `extracted_text` (mesmo pipeline `unpdf`, campo `documents.extracted_text`) é injetado direto no prompt da análise **daquele** aluno (ver `04-ia.md`). Se no futuro um aluno acumular documentos demais para caber em contexto, cria-se tabela separada `student_doc_chunks` (`tenant_id` + `student_id`, RLS estrita) — decisão adiada de propósito.

---

## 5. Busca web complementar (Tavily)

Provedor **Tavily**: projetado para RAG (retorna snippets limpos prontos p/ prompt), ~$0,008/busca basic, 1.000 créditos/mês grátis (cobrem o MVP inteiro), suporta `include_domains`. Descartada a Exa ($7/1k, orientada a descoberta em inglês).

### 5.1 Gatilho de fallback

Rodar **sempre o retrieval local primeiro**; chamar Tavily **somente** se:

1. `top-1 similarity < 0.50` **ou** menos de 3 chunks com `similarity > 0.35` (base local não cobre o assunto); **ou**
2. a pergunta pede informação claramente atual ("estudos recentes", "diretriz 2026"); **ou**
3. a profissional ativa o toggle "buscar também na web" (transparência de UX).

Parâmetros: `search_depth: 'basic'`, `max_results: 5`, `include_domains` com **allowlist** de fontes confiáveis de saúde — `scielo.br`, `pubmed.ncbi.nlm.nih.gov`, `pedro.org.au`, `bvsalud.org` — expansível por config.

### 5.2 Cache de 7 dias

Resultado cacheado por **query normalizada** em `web_search_cache` (TTL 7 dias) para poupar créditos. Lookup por hash da query normalizada antes de qualquer chamada à Tavily.

### 5.3 Regra LGPD da query (regra de código)

A query enviada à Tavily é construída **apenas com termos técnicos** (patologia, exercício, objetivo) — **nunca** nome, idade, CPF, contato ou qualquer identificador do aluno. Isso é implementado num **builder de query separado**, não deixado a convenção. É a mesma fronteira do §4: dado de saúde identificável não sai do banco para um terceiro.

### 5.4 Combinação no prompt

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

A UI renderiza `[KB-n]` como chips clicáveis (abrem o trecho/documento) e `[WEB-n]` com link externo — essencial para a confiança de um público não técnico.

---

## 6. Como o RAG alimenta os dois casos de uso de IA

Módulo central `lib/ai/rag.ts` expõe `ragSearch(query, { tenantId, k })`: gera o embedding da query (OpenRouter), chama `match_kb_chunks`, avalia o gatilho de fallback (§5.1), e — se disparar — consulta a Tavily (com cache) e devolve `{ kbChunks, webResults }` já normalizados para o prompt. Detalhes de prompts, schema do relatório e geração ficam em `04-ia.md`; aqui está só o que o RAG entrega.

### 6.1 Relatório de evolução do aluno (Fase 6)

Job sob demanda ("Gerar análise com IA"), server-side, síncrono (`generateObject`, sem streaming, sem fila):

1. **Coleta estruturada (sem RAG):** avaliação + anamnese, condições, últimas N sessões (exercícios, cargas, dor pré/pós, observações), medidas/reavaliações, e o `extracted_text` dos documentos daquele aluno. Tudo **pseudonimizado** (sem nome/CPF/contato) antes de ir ao prompt.
2. **Multi-query:** `claude-haiku-4.5` gera 3–5 queries a partir do quadro do aluno (ex.: "progressão de carga pilates hérnia discal lombar", "contraindicações extensão torácica osteoporose").
3. **Retrieval:** `ragSearch` por query (k=6), dedupe por `id`, corte por orçamento de ~10–12 chunks (~8k tokens). Fallback web por query, se o gatilho disparar — com a **query técnica pseudonimizada** (§5.3).
4. **Geração:** dados estruturados + contexto RAG → `generateObject` + Zod, com seções fixas (Evolução no Pilates, Evolução corporal/postural, Pontos de atenção, Sugestões de progressão, Fontes consultadas). Persistido em `ai_reports` com as citações e os ids dos chunks usados (rastreabilidade LGPD + depuração de qualidade).

### 6.2 Chat/assistente técnico (Fase 7)

Rota de chat com streaming (`streamText`, AI SDK v6), via **tool-calling** — o modelo decide quando buscar (nem toda mensagem precisa de retrieval, e o modelo formula queries melhores que o embedding da mensagem crua):

- **`buscar_conhecimento`** — chama `ragSearch` (k=8) sobre a KB (global + tenant), com fallback web condicional embutido.
- **`buscar_ficha_aluno`** — snapshot do aluno via RLS (dados do tenant, e só dele).
- **`buscar_web`** — Tavily direto, quando o modelo julga necessário (gatilho + allowlist + cache), sempre com query técnica pseudonimizada.
- `stopWhen: stepCountIs(5)`; citações `[KB-n]`/`[WEB-n]` renderizadas como chips; disclaimer permanente de que não substitui julgamento clínico.

---

## 7. Custos estimados (ordem de grandeza, por tenant ativo)

| Item | Estimativa | Custo |
|---|---|---|
| Embeddar um livro de 300 páginas (~200k tokens) | 1x por documento | **< $0,01** |
| Query de embedding da pergunta (retrieval) | por busca | desprezível |
| Busca web Tavily | por busca com fallback | ~$0,008 (free tier cobre 1.000/mês) |
| QStash (ingestão) | por documento | free tier (1.000 msgs/dia) |
| Mensagem de chat (retrieval + ~5k in / 0,6k out no Sonnet) | por mensagem | ~$0,016 |
| Relatório de evolução (~15k in / 2k out) | por relatório | ~$0,05 |

**Conclusão:** o custo dominante é o LLM de geração; o RAG em si (embeddings + pgvector + Tavily) é ruído. Nenhum item exige plano pago adicional no MVP além do Vercel Pro (já necessário por `maxDuration` e uso comercial). Detalhamento de quota/cache de geração em `04-ia.md`.

---

## 8. Golden set de retrieval (teste de qualidade)

Conjunto de **~15 perguntas** de fisioterapia/Pilates com os chunks/documentos esperados, rodado como **teste de regressão de retrieval** desde a Fase 5 (ver `09-testes-qualidade.md`). Roda offline contra `match_kb_chunks` (sem chamar o LLM de geração), medindo se o chunk certo aparece no top-k.

**Critério de aceite (Fase 5):** `match_kb_chunks` retorna o resultado esperado para **≥80%** do golden set. Serve de gate contra regressões de chunking, mudança de `EMBEDDINGS_MODEL` ou ajuste dos pesos do RRF.

Formato (exemplos ilustrativos — o conjunto real cobre semântica pura, termo clínico exato e casos de fallback):

| # | Pergunta | Deve recuperar (top-k) | O que testa |
|---|---|---|---|
| 1 | "Quais contraindicações de Pilates na osteoporose?" | chunk sobre contraindicações/osteoporose | recall semântico |
| 2 | "espondilolistese L5-S1" | chunk com o termo exato | força do FTS `portuguese` (termo raro) |
| 3 | "Progressão de carga no reformer para lombalgia crônica" | protocolo de progressão lombar | recall em protocolo de exercício |
| 4 | "exercícios para diástase abdominal no pós-parto" | seção sobre core/pós-parto | semântico + termo clínico |
| 5 | "o que é a manobra de McKenzie" | chunk com o nome próprio da técnica | nome próprio (FTS pega; vetor às vezes erra) |
| 6 | "Pilates é seguro para gestantes no primeiro trimestre?" | contraindicações/gestação | reescrita de query + recall |
| 7 | "mobilidade torácica em hipercifose" | seção postural torácica | termo anatômico |
| 8 | "carga de mola para iniciante com hérnia discal" | progressão/hérnia | combinação de conceitos |
| 9 | "escala EVA de dor como interpretar" | chunk sobre avaliação de dor | sigla técnica (EVA) |
| 10 | "fortalecimento de assoalho pélvico" | seção de assoalho pélvico | semântico direto |
| 11 | "contraindicações de flexão de coluna na osteoporose" | contraindicação específica | precisão (não confundir com extensão) |
| 12 | "diretriz recente 2026 sobre exercício e dor lombar" | (esperado: **disparar fallback web**) | gatilho de atualidade (§5.1) |
| 13 | "protocolo pós-cirúrgico de LCA no Pilates" | reabilitação de joelho/LCA | sigla + contexto cirúrgico |
| 14 | "respiração diafragmática no método Pilates" | princípio de respiração | conceito fundamental |
| 15 | "como registrar evolução de flexibilidade" | (esperado: **base pode não cobrir** → similarity baixa) | teste do gatilho de "não encontrou base" |

Cada caso guarda a query, os ids/documentos esperados e o comportamento esperado (recuperar vs. disparar fallback vs. "não há base"). O runner reporta hit-rate no top-k e serve de gate de CI quando a base global seed está carregada.

---

## 9. Riscos e portas abertas

| Risco | Mitigação |
|---|---|
| **PDF escaneado sem texto** | Falha explícita em pt-BR no MVP (`status='failed'`); OCR em fase futura. |
| **Troca do modelo de embedding** = re-embeddar tudo | `EMBEDDINGS_MODEL`/`EMBEDDINGS_DIM` via env + coluna `embedding_model` em `kb_documents`; decisão travada antes da migration de `kb_chunks`. |
| **Base global > ~500k chunks** | Avaliar `halfvec(1536)` + upgrade de compute do Supabase; monitorar RAM. |
| **Retrieval em pt-BR insatisfatório** | Golden set (§8) como regressão desde a Fase 5; plano B `text-embedding-3-large`; plano C reranker (hook em §3.3). |
| **Retry do QStash duplicando chunks** | Delete-antes-de-inserir por lote (§2.6) — idempotência garantida. |
| **Muitos documentos por aluno** (não cabe em contexto) | Criar `student_doc_chunks` por aluno (RLS estrita) — decisão adiada (§4), sem quebrar a fronteira LGPD. |
| **Times/estúdios no futuro** | `tenant_id` + `scope` já comportam um nível de agrupamento acima sem migração destrutiva. |
