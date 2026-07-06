# Arquitetura

Parte do planejamento do FisioPilates — ver 00-visao-geral.md.

Este documento dá a **visão macro** do sistema: quais componentes existem, como as requisições fluem entre eles, onde cada pedaço de lógica roda (RSC, Server Action, Route Handler, worker QStash) e as decisões de arquitetura vinculantes (C1–C19) que resolvem os conflitos entre os designs de origem. Os detalhes de cada área vivem nos documentos subsequentes (`02-banco-de-dados.md`, `03-rag.md`, `04-ia.md`, `05-frontend-ux.md`, `06-infra-deploy.md`).

---

## 1. Componentes

| Componente | Papel | Onde roda |
|---|---|---|
| **Next.js 16 (App Router)** | Aplicação: RSC para páginas, Server Actions para mutações, Route Handlers para HTTP puro (chat/streaming, webhooks). | Vercel, região **`gru1`** (São Paulo), Fluid Compute, plano **Pro**. |
| **Supabase** | Postgres (dados + pgvector), Auth (cookies/SSR), Storage (buckets privados), RLS. | Região **`sa-east-1`** (São Paulo). |
| **OpenRouter** | Gateway único para o LLM (`anthropic/claude-sonnet-5`, fallback `claude-sonnet-4.6`, auxiliar `claude-haiku-4.5`) **e** para embeddings (`openai/text-embedding-3-small`, 1536d, via `POST /v1/embeddings`). | Serviço externo; chamado só do servidor. |
| **QStash (Upstash)** | Fila HTTP para **ingestão de KB** (lotes de páginas auto-encadeados, retries/DLQ, idempotente). Único mecanismo de background job. | Serviço externo; dispara o worker na Vercel. |
| **Tavily** | Busca web para o chat (allowlist scielo/pubmed/pedro/bvsalud, cache 7 dias), acionada como fallback. | Serviço externo; chamado só do servidor. |

Toda comunicação com OpenRouter, Tavily e o `service_role` do Supabase acontece **exclusivamente no servidor**. O navegador fala apenas com a app Next.js e, para upload/download de arquivos, diretamente com o Supabase Storage via signed URLs.

### Diagrama de componentes

```
                         ┌───────────────────────────────────────────────┐
                         │  Navegador (mobile-first, pt-BR)               │
                         │  RSC hidratado + Client Components pontuais     │
                         └───────┬───────────────────────────┬───────────┘
                                 │ HTTPS (cookies)            │ signed URL (PUT/GET)
                                 ▼                            ▼
        ┌────────────────────────────────────────┐   ┌──────────────────────┐
        │  Next.js 16 na Vercel (gru1, Pro)      │   │  Supabase Storage     │
        │  ┌──────────┐ ┌───────────────┐        │   │  (buckets privados)   │
        │  │  RSC     │ │ Server Actions│        │   └──────────────────────┘
        │  │ (páginas)│ │  (mutações)   │        │
        │  └────┬─────┘ └──────┬────────┘        │
        │       │              │                 │
        │  ┌────┴──────────────┴───────────────┐ │
        │  │ Route Handlers (/api)             │ │
        │  │  /api/ai/chat   /api/ai/analyses  │ │
        │  │  /api/jobs/ingest (worker QStash) │ │
        │  └──────┬─────────┬─────────┬────────┘ │
        └─────────┼─────────┼─────────┼──────────┘
        cliente   │         │         │  service_role (bypassa RLS,
        autenticado         │         │  filtro de tenant manual)
        (RLS ativa)         ▼         ▼         ▼
             ▼        ┌───────────┐ ┌────────┐ ┌────────┐ ┌────────┐
        ┌─────────┐  │ OpenRouter│ │ Tavily │ │ QStash │ │Supabase│
        │Supabase │  │ LLM +     │ │ web    │ │ fila   │ │Postgres│
        │Postgres │  │ embeddings│ │ search │ │        │ │+pgvector│
        │+ RLS    │  └───────────┘ └────────┘ └───┬────┘ └────────┘
        └─────────┘                                │ dispara
                                                   └──► /api/jobs/ingest
```

---

## 2. Fluxos principais

### 2.1 Request autenticado (leitura de página)

RSC lê dados com o **client autenticado** (RLS ativa) — nunca com `service_role`. O `tenant_id` vem sempre da sessão, nunca de input do usuário.

```
Navegador ──req(cookies)──► proxy.ts (ex-middleware, Next 16; updateSession, só UX/redirect)
                              │
                              ▼
                        RSC da página
                              │  requireUser()/requireTenant()  [React.cache]
                              ▼
                   Supabase client autenticado (RLS)
                              │  SELECT ... (policy filtra por tenant)
                              ▼
                        HTML renderizado no servidor ──► Navegador
```

### 2.2 Geração de relatório de evolução

Síncrono, sem fila e sem streaming de tokens: `generateObject` + Zod, com cache por `input_hash` e quota por tenant. `maxDuration = 300` (Fluid Compute) cobre o caso com folga.

```
UI "Gerar análise" ─POST─► /api/ai/analyses  (maxDuration=300)
                              │ 1. assertQuota(tenant)
                              │ 2. builder do dossiê (server-side, PSEUDONIMIZADO):
                              │      avaliações + condições + sessões + medidas
                              │      + extracted_text de docs + multi-query RAG
                              │ 3. input_hash → cache hit? ──► devolve relatório existente
                              │ 4. generateObject(claude-sonnet-5) + retry/backoff
                              │ 5. persiste ai_reports (status='draft') + ai_usage_log
                              ▼
UI faz polling do status ──► rascunho pronto ──► profissional revisa e aprova
```

### 2.3 Ingestão de base de conhecimento (KB)

Único uso de QStash. Upload direto ao Storage; processamento em lotes de páginas auto-encadeados e idempotentes (delete-antes-de-inserir).

```
UI upload ─signed URL─► Storage (bucket kb-sources)
   │
   └─POST─► cria kb_documents (status='queued')
              │
              ▼
        QStash.publishJSON ──► /api/jobs/ingest (assinatura verificada, maxDuration=300)
                                  │ [service_role]
                                  │ 1. baixa PDF (stream)
                                  │ 2. unpdf: extrai texto por página (lote)
                                  │ 3. chunking recursivo + cabeçalho contextual
                                  │ 4. embeddings em lote (OpenRouter /v1/embeddings)
                                  │ 5. insert kb_chunks + update processed_pages
                                  │ 6. restam páginas? ──► re-enfileira próximo lote
                                  │    senão ──► status='ready'
                                  ▼
                     kb_documents: queued → processing → ready | failed
                     (UI mostra progresso por páginas)
```

### 2.4 Chat assistente com RAG

Streaming SSE via AI SDK, com tool-calling — o modelo decide quando buscar. `maxDuration = 120`.

```
UI (useChat) ─POST─► /api/ai/chat  (maxDuration=120)
                        │ streamText(claude-sonnet-5) + tools:
                        │   buscar_conhecimento  → ragSearch (vetor+FTS RRF, RLS)
                        │   buscar_ficha_aluno    → snapshot do aluno (RLS)
                        │   buscar_web            → Tavily (fallback, cache 7d)
                        │ stopWhen: stepCountIs(5)
                        │ prompt caching Anthropic no system estável
                        ▼
             SSE stream ──► UI renderiza incrementalmente
                        │  consumeStream() garante gravação de uso mesmo se o cliente abortar
                        ▼
             persiste chat_messages (parts jsonb UIMessage + citations) + ai_usage_log
```

---

## 3. Fronteiras server/client e onde roda cada coisa

| Camada | Executa | Regra |
|---|---|---|
| **RSC (React Server Components)** | Páginas e leituras. Buscam dados com o **client autenticado** (RLS). | Dados de página vêm por RSC; não duplicar em TanStack Query. |
| **Server Actions** | Mutações (criar/editar aluno, sessão, upload de metadado, etc.). Retorno padronizado `{ ok, data | erro }`, `revalidatePath`. | `tenant_id` **nunca** vem do formulário — sempre da sessão via `requireTenant()`. |
| **Route Handlers (`/api`)** | HTTP puro: streaming (`/api/ai/chat`), operações longas/estruturadas (`/api/ai/analyses`) e o worker de fila (`/api/jobs/ingest`). | `maxDuration` explícito por rota (120 chat, 300 análise/ingestão). |
| **Worker QStash** | Só ingestão de KB. Assinatura QStash verificada; usa `service_role`. | `service_role` **bypassa RLS** → filtro de `tenant_id`/escopo manual e revisado. |
| **`proxy.ts`** (ex-`middleware.ts`, renomeado no Next 16) | `updateSession` + redirects. | É **UX, não segurança** — a segurança é RLS no banco. |
| **Client Components (`"use client"`)** | Interatividade pontual: `useChat`, polling de relatório, uploads com progresso, gráficos Recharts, busca com debounce. | Estado local + TanStack Query pontual; sem store global. |
| **`service_role`** | Apenas em pipelines server-side (ingestão RAG; leitura de dossiê para relatório quando necessário). | Todo uso passa pelo checklist de filtro de tenant (revisão na fase de hardening). |

Isolamento de dados é garantido no **banco** (RLS em 100% das tabelas + policies de Storage por prefixo de tenant), não na aplicação. O caminho preferencial é sempre o client autenticado; `service_role` é exceção auditada.

---

## 4. Decisões de arquitetura (C1–C19, ADR-lite)

Decisões finais e **vinculantes**. Onde os designs de origem divergiram, a escolha abaixo prevalece e deve ser seguida na implementação.

| # | Decisão | Justificativa (1 linha) |
|---|---|---|
| **C1** | **Schema em inglês** (`tenants`, `students`, `sessions`, `assessments`…), **UI 100% pt-BR**; textos isolados em `lib/textos.ts`. | Schema em inglês é convenção durável; a camada de textos isola o idioma da UI do banco. |
| **C2** | Criação de tenant **híbrida**: trigger no signup cria `profiles` + `tenants` + `tenant_members` mínimos; o onboarding só **completa** dados (nome, CREFITO, estúdio) via Server Action. | Toda usuária nasce com tenant (RLS funciona desde o 1º request) e o onboarding vira um simples UPDATE, sem `service_role` no caminho. |
| **C3** | Schema RAG do modelo de RAG (`kb_documents`/`kb_chunks` com `fts tsvector`, `context_header`, `page_start/end`, `processed_pages`, PK `bigint identity` nos chunks) + **RLS pattern** com `private.user_tenant_ids()`. | O design de RAG é a autoridade em busca (híbrida exige FTS); o de dados é a autoridade em segurança. |
| **C4** | Busca **híbrida vetor + FTS `portuguese` com RRF** (`match_kb_chunks`), `SECURITY INVOKER` + filtro explícito de tenant (defesa em profundidade). | Termos clínicos exatos em pt-BR exigem FTS; RRF combina os sinais sem tuning. |
| **C5** | Embeddings via **OpenRouter `POST /v1/embeddings`** com `openai/text-embedding-3-small` (1536d); client OpenAI-compatible com `baseURL`/key via env (`EMBEDDINGS_MODEL`, `EMBEDDINGS_DIM`). | Endpoint verificado em 2026; uma única key/fatura, e migrar para OpenAI direto é trocar 2 env vars. |
| **C6** | Chat RAG por **tool-calling** (AI SDK v6: `buscar_conhecimento`, `buscar_ficha_aluno`, `buscar_web`, `stopWhen: stepCountIs(5)`). | Nem toda mensagem precisa de busca; o modelo formula queries melhores que o embedding da mensagem crua, e o AI SDK torna o custo de código ~zero. |
| **C7** | **Relatórios primeiro** (Fase 6), **chat depois** (Fase 7). | O relatório de evolução é o diferencial e depende de dados já existentes nas fases 2–4; o chat reaproveita a infra de retrieval/uso. |
| **C8** | Geração de relatório com **`generateObject` + Zod, síncrono** (`maxDuration = 300`), UI com progresso/polling — **sem streaming de tokens e sem fila para relatórios**. | JSON estruturado dá renderização consistente, cache por `input_hash` e auditoria; 300s de Fluid Compute cobrem o caso. QStash fica só para ingestão. |
| **C9** | Tabelas de chat com **nomes** `chat_conversations`/`chat_messages` e **payload** `chat_messages.parts jsonb` no formato `UIMessage` do AI SDK (+ coluna `citations`). | Preserva tool calls para replay/hidratação do `useChat` sem inventar um formato próprio. |
| **C10** | `ai_reports`: **merge** — `structured jsonb` (saída do `generateObject`) como fonte de verdade + `input_hash` com unique `(tenant_id, student_id, report_type, period, input_hash)`; `content_md` como render opcional para export. | Cache/idempotência + auditabilidade (`input_snapshot`) num só desenho. |
| **C11** | **3 buckets**: `student-documents`, `kb-sources` (prefixo `global/` vs `{tenant_id}/`), `avatars` — todos privados, signed URLs curtas. | Um bucket de KB com policy por prefixo é menos superfície que dois; nomes em inglês seguem C1. |
| **C12** | Helper RLS **`private.user_tenant_ids()`** (setof uuid) em todas as policies. | Já suporta o futuro 1-usuária-N-tenants sem reescrever policies. |
| **C13** | Modelo LLM **`anthropic/claude-sonnet-5`** pinado via env (`OPENROUTER_MODEL`); fallback `anthropic/claude-sonnet-4.6` via `extraBody.models`; `anthropic/claude-haiku-4.5` para tarefas baratas; orçar a **preço cheio $3/$15**. | Convergência dos designs; nunca usar alias `latest` em produção. |
| **C14** | Busca web via **Tavily** (allowlist scielo/pubmed/pedro/bvsalud, cache 7 dias). | Mais barato que Exa, free tier cobre o MVP, retorno pronto para prompt. |
| **C15** | Background jobs: **QStash apenas para ingestão de KB** (lotes de 50 páginas auto-encadeados, idempotentes); relatórios síncronos (C8); sem Trigger.dev, sem Edge Functions. | Um único mecanismo de fila, um único code path de ingestão. |
| **C16** | Migrations/ORM: **Supabase CLI migrations** + `supabase gen types typescript`; sem Prisma/Drizzle. | ~40% do schema (RLS, triggers, HNSW, storage policies) não é expressável em ORM. |
| **C17** | **Vercel Pro desde o início**. | Uso comercial + `maxDuration` de 300s com folga; não vale o risco de migrar sob pressão. |
| **C18** | Lint com **Biome 2.x** (sem ESLint/Prettier). | Ferramenta única e rápida, sem conflito real de escolha. |
| **C19** | `extracted_text` de documentos de aluno: extração **no upload** (`unpdf`, síncrona para arquivos pequenos; via QStash se >20 páginas), campo `documents.extracted_text`; **nunca vetorizado em `kb_chunks`**. | Convergência dos designs; a fronteira LGPD entre KB técnica e dado de saúde é regra de arquitetura. |

Tudo o mais que não conflita segue como especificado na área de origem: schema completo e RLS em `02-banco-de-dados.md`, pipeline de ingestão/chunking/HNSW em `03-rag.md`, prompts/guardrails/custos em `04-ia.md`, estrutura de pastas/telas/padrões em `05-frontend-ux.md`.
