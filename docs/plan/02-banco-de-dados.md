# Banco de Dados, Multi-tenancy e Segurança

Parte do planejamento do FisioPilates — ver 00-visao-geral.md

Este documento é a autoridade sobre o schema Postgres do projeto: modelo de dados completo, estratégia de multi-tenancy com Row Level Security (RLS), triggers, Storage, considerações de LGPD no banco, ordem das migrations e armadilhas conhecidas. A stack de dados é **Supabase** (Postgres + Auth + Storage + pgvector) na região **sa-east-1 (São Paulo)**, com migrations versionadas via **Supabase CLI**.

> Convenção de idioma: **todo o schema (tabelas, colunas, funções, policies) é em inglês**; a camada de textos da UI (`lib/textos.ts`) isola o idioma pt-BR do banco. Ver glossário pt-BR ↔ schema em `00-visao-geral.md`.

---

## 0. Princípios do design

1. **`tenant_id` em TODAS as tabelas de domínio** + RLS habilitado em 100% das tabelas do schema `public`. É obrigatório no Supabase: qualquer tabela do schema exposto é alcançável via Data API (PostgREST); sem RLS, é acesso aberto.
2. **1 tenant = 1 profissional no MVP**, mas modelado com tabela de membership (`tenant_members`) para não fechar a porta para times/estúdios no futuro.
3. **Autorização nunca via `user_metadata`** (é editável pela própria usuária). A associação usuária↔tenant vive em tabela própria (`tenant_members`); se algum dia for otimizada com claim no JWT, usar `app_metadata` (não editável pelo usuário).
4. **PKs `uuid` (`gen_random_uuid()`)** nas entidades de domínio — evita enumeração de IDs (IDOR/BOLA) e funciona bem com clientes distribuídos/serverless. Exceções deliberadas: `audit_logs` e `kb_chunks` usam `bigint generated always as identity` (tabelas de alto volume onde não há exposição de ID ao cliente).
5. **Campos "enum" como `text` + `CHECK` constraint** (não `CREATE TYPE enum`). Alterar enums nativos em migration é doloroso; um check constraint é trivial de evoluir.
6. **Híbrido estruturado + JSONB**: colunas estruturadas para tudo que precisa de filtro, gráfico ou agregação; JSONB para conteúdo clínico narrativo e seções de formulário que ainda vão evoluir. O JSONB é serializado direto no prompt da IA.
7. **Timestamps sempre `timestamptz`**; `created_at`/`updated_at` em tudo (trigger `set_updated_at`); soft delete (`deleted_at`) nas entidades clínicas para suportar o fluxo LGPD de exclusão em duas fases.
8. **`service_role` só no servidor** (route handlers e jobs de IA). Atenção crítica: o `service_role` **bypassa RLS** — todo código server-side que o usa DEVE filtrar `tenant_id` manualmente. Regra de ouro: preferir sempre o client autenticado (RLS ativa) e reservar `service_role` apenas para pipelines (ingestão de RAG, geração de relatório) onde não há sessão de usuária.

---

## 1. Esquema de tabelas

O schema completo é dividido por área. A ordem aqui é lógica (leitura); a ordem de aplicação em migrations está na [seção 7](#7-ordem-das-migrations).

### 1.1 Identidade e tenancy

```sql
-- Extensões (migration 0001)
create extension if not exists vector;      -- pgvector (RAG)
create extension if not exists pg_trgm;     -- busca fuzzy por nome de aluno/exercício

-- Tenant = "consultório" da profissional (1 profissional no MVP)
create table public.tenants (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,                          -- nome de exibição (ex.: "Studio Ana Fisio")
  plan         text not null default 'free'
               check (plan in ('free','pro','trial')), -- preparado p/ billing futuro
  plan_expires_at timestamptz,
  status       text not null default 'active'
               check (status in ('active','suspended','deleted')),
  ai_monthly_limit_usd numeric(8,2) not null default 20.00,  -- quota mensal de IA (ver 04-ia.md)
  settings     jsonb not null default '{}',            -- preferências (fuso, templates padrão…)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

-- Perfil 1:1 com auth.users (criado por trigger no signup)
create table public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  phone         text,
  crefito       text,                                  -- registro profissional (COFFITO/CREFITO)
  avatar_path   text,                                  -- path no Storage (bucket avatars)
  onboarding_completed_at timestamptz,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Membership: hoje sempre 1 linha (owner); amanhã permite equipes
create table public.tenant_members (
  tenant_id   uuid not null references public.tenants(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null default 'owner'
              check (role in ('owner','member')),       -- 'member' reservado p/ futuro
  created_at  timestamptz not null default now(),
  primary key (tenant_id, user_id)
);
create index on public.tenant_members (user_id);  -- query mais quente do sistema (RLS)
```

**Fluxo de signup (híbrido, ver `05-frontend-ux.md`):** um trigger `after insert on auth.users` (SECURITY DEFINER, schema `private`) cria as linhas mínimas de `profiles` + `tenants` + `tenant_members(role='owner')` numa única transação. Assim **toda usuária nasce com tenant próprio e a RLS já funciona no primeiro request**, sem service_role no caminho. O onboarding depois só **completa** os dados (nome, CREFITO, telefone, nome do estúdio) via Server Action — vira um simples `UPDATE` do próprio perfil/tenant, sob RLS. Ver o SQL do trigger na [seção 4](#4-triggers).

### 1.2 Alunos

```sql
create table public.students (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  full_name      text not null,
  birth_date     date,
  sex            text check (sex in ('female','male','other','not_informed')),
  cpf            text,                    -- opcional; validado na app (minimização LGPD)
  phone          text,
  email          text,
  occupation     text,                    -- profissão (relevante p/ análise postural)
  emergency_contact_name  text,
  emergency_contact_phone text,
  status         text not null default 'active'
                 check (status in ('active','paused','archived')),
  general_notes  text,
  -- LGPD (ver seção 6)
  consent_signed_at   timestamptz,        -- consentimento p/ tratamento de dados de saúde
  consent_version     text,
  consent_document_id uuid,               -- FK adicionada depois (documents) p/ termo assinado escaneado
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index on public.students (tenant_id);
create index on public.students using gin (full_name gin_trgm_ops); -- busca por nome
```

### 1.3 Avaliação fisioterapêutica / anamnese

Racional de estruturado vs JSONB na [seção 3](#3-modelagem-da-ficha-de-avaliação--estruturado-vs-jsonb).

```sql
create table public.assessments (
  id             uuid primary key default gen_random_uuid(),
  tenant_id      uuid not null references public.tenants(id) on delete cascade,
  student_id     uuid not null references public.students(id) on delete cascade,
  kind           text not null default 'initial'
                 check (kind in ('initial','reassessment','discharge')),
  assessed_at    date not null default current_date,
  -- Campos estruturados (filtro/listagem/IA)
  main_complaint     text,                -- queixa principal
  clinical_diagnosis text,                -- diagnóstico clínico (se houver encaminhamento)
  goals              text[],              -- objetivos ("melhorar postura", "reduzir dor lombar")
  pain_level_initial smallint check (pain_level_initial between 0 and 10),  -- EVA
  -- Seções semi-estruturadas (formulário evolui sem migration)
  anamnesis          jsonb not null default '{}',  -- HDA, HPP, medicamentos, cirurgias, hábitos...
  postural_assessment jsonb not null default '{}', -- vistas anterior/posterior/lateral, achados
  physical_tests     jsonb not null default '{}',  -- testes específicos, ADM, força
  contraindications  text[],                        -- ex.: {'flexão de tronco carregada'}
  notes              text,
  created_by     uuid not null references auth.users(id),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  deleted_at     timestamptz
);
create index on public.assessments (tenant_id, student_id, assessed_at desc);

-- Patologias/condições como LINHAS (filtráveis, alimentam prompt da IA e contraindicações)
create table public.student_conditions (
  id           uuid primary key default gen_random_uuid(),
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  student_id   uuid not null references public.students(id) on delete cascade,
  name         text not null,             -- "Hérnia discal L4-L5"
  cid_code     text,                      -- CID-10 opcional
  status       text not null default 'active'
               check (status in ('active','resolved','under_observation')),
  severity     text check (severity in ('mild','moderate','severe')),
  notes        text,
  diagnosed_at date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index on public.student_conditions (tenant_id, student_id);
```

### 1.4 Exercícios e sessões de Pilates

```sql
-- Catálogo: linhas com tenant_id NULL = catálogo global (seed do sistema);
-- com tenant_id = exercício customizado da profissional
create table public.exercises (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid references public.tenants(id) on delete cascade,  -- NULL = global
  name          text not null,
  apparatus     text not null default 'mat'
                check (apparatus in ('mat','reformer','cadillac','chair','barrel','accessories','other')),
  category      text,                     -- 'mobilidade','fortalecimento','alongamento','equilíbrio'
  difficulty    text check (difficulty in ('basic','intermediate','advanced')),
  description   text,
  muscle_groups text[],
  contraindications text[],
  media_path    text,                     -- imagem/vídeo demonstrativo no Storage (futuro)
  is_active     boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (tenant_id, name)
);
create index on public.exercises (tenant_id);

create table public.sessions (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  student_id    uuid not null references public.students(id) on delete cascade,
  session_date  date not null default current_date,
  start_time    time,
  duration_min  smallint,
  status        text not null default 'completed'
                check (status in ('scheduled','completed','no_show','cancelled')),
  pain_level_pre  smallint check (pain_level_pre between 0 and 10),
  pain_level_post smallint check (pain_level_post between 0 and 10),
  focus         text,                     -- foco da aula ("core + mobilidade torácica")
  notes         text,                     -- evolução clínica da sessão (texto livre)
  created_by    uuid not null references auth.users(id),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
);
create index on public.sessions (tenant_id, student_id, session_date desc);

-- Exercícios executados na sessão (base da análise de progresso — ver seção 5)
create table public.session_exercises (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  session_id    uuid not null references public.sessions(id) on delete cascade,
  exercise_id   uuid not null references public.exercises(id),
  order_index   smallint not null default 0,
  sets          smallint,
  reps          smallint,
  load_springs  text,                     -- Pilates usa molas: "2 vermelhas + 1 azul"
  load_kg       numeric(5,2),             -- quando houver carga quantificável
  resistance_level smallint,              -- escala 1-5 normalizada (permite gráfico)
  difficulty_felt  smallint check (difficulty_felt between 1 and 5),  -- percepção de esforço
  quality_rating   smallint check (quality_rating between 1 and 5),   -- qualidade de execução
  notes         text,
  created_at    timestamptz not null default now()
);
create index on public.session_exercises (tenant_id, session_id);
create index on public.session_exercises (tenant_id, exercise_id);  -- progresso por exercício
```

### 1.5 Medidas corporais (série temporal)

```sql
create table public.body_measurements (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  student_id    uuid not null references public.students(id) on delete cascade,
  measured_at   date not null default current_date,
  weight_kg     numeric(5,2),
  height_cm     numeric(5,1),
  -- circunferências e testes padronizados; chaves canônicas conhecidas pela app
  circumferences jsonb not null default '{}',  -- {"waist_cm":78,"hip_cm":102,"right_thigh_cm":56,...}
  flexibility    jsonb not null default '{}',  -- {"sit_and_reach_cm":12,"shoulder_flexion_deg":170,...}
  notes         text,
  created_at    timestamptz not null default now(),
  unique (tenant_id, student_id, measured_at)  -- 1 medição/dia por aluno
);
create index on public.body_measurements (tenant_id, student_id, measured_at desc);
```

### 1.6 Documentos (metadados; binário no Storage)

O binário fica no Supabase Storage; esta tabela é a **fonte de verdade dos metadados**. O texto extraído (`extracted_text`) é preenchido no upload (`unpdf`, runtime nodejs) e **nunca é vetorizado em `kb_chunks`** — é injetado diretamente no prompt da análise daquele aluno. Essa é a fronteira LGPD entre KB técnica e dado de saúde (ver [seção 5](#5-supabase-storage) e `03-rag.md`).

```sql
create table public.documents (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  student_id    uuid references public.students(id) on delete cascade,  -- NULL = doc do tenant
  kind          text not null default 'other'
                check (kind in ('exam','postural_photo','medical_report','consent_form','other')),
  bucket        text not null default 'student-documents',
  storage_path  text not null,            -- '{tenant_id}/{student_id}/{doc_id}-{slug}.pdf'
  file_name     text not null,
  mime_type     text not null,
  size_bytes    bigint not null,
  taken_at      date,                     -- data do exame/foto (≠ data do upload)
  description   text,
  extracted_text text,                    -- texto p/ contexto da IA (parse no upload; NUNCA vetorizado)
  uploaded_by   uuid not null references auth.users(id),
  created_at    timestamptz not null default now(),
  deleted_at    timestamptz,
  unique (bucket, storage_path)
);
create index on public.documents (tenant_id, student_id);

-- FK do termo de consentimento assinado (criada depois de documents existir)
alter table public.students
  add constraint students_consent_document_fk
  foreign key (consent_document_id) references public.documents(id) on delete set null;
```

### 1.7 Relatórios de IA

O relatório de evolução é gerado por `generateObject` (JSON estruturado + Zod, síncrono) — ver `04-ia.md`. A **fonte de verdade da saída é `structured jsonb`**; `content_md` é um render opcional para export. `input_snapshot` guarda os IDs de sessões/avaliações/medidas usados (auditabilidade e reprodutibilidade); `input_hash` habilita cache/idempotência via `unique`.

```sql
create table public.ai_reports (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  student_id    uuid not null references public.students(id) on delete cascade,
  report_type   text not null
                check (report_type in ('pilates_evolution','postural_evolution','full_evolution')),
  period_start  date,
  period_end    date,
  status        text not null default 'pending'
                check (status in ('pending','processing','completed','failed')),
  model         text,                     -- ID pinado do OpenRouter (ex.: 'anthropic/claude-sonnet-5')
  structured    jsonb not null default '{}',  -- saída do generateObject (fonte de verdade da UI)
  content_md    text,                         -- render markdown opcional p/ export
  input_snapshot jsonb not null default '{}', -- ids de sessions/assessments/measurements usados
  input_hash    text not null,                -- hash determinístico do dossiê (cache/idempotência)
  citations     jsonb not null default '[]',  -- fontes RAG/web citadas
  usage         jsonb not null default '{}',  -- tokens, custo real
  error_message text,
  requested_by  uuid not null references auth.users(id),
  created_at    timestamptz not null default now(),
  completed_at  timestamptz,
  -- Idempotência: regerar sem mudança de dados retorna o relatório em cache
  unique (tenant_id, student_id, report_type, period_start, period_end, input_hash)
);
create index on public.ai_reports (tenant_id, student_id, created_at desc);

-- Log de uso agregado de IA (relatórios + chat compartilham a quota mensal)
create table public.ai_usage_log (
  id           bigint generated always as identity primary key,
  tenant_id    uuid not null references public.tenants(id) on delete cascade,
  user_id      uuid references auth.users(id),
  kind         text not null check (kind in ('report','chat','embedding','multi_query')),
  model        text,
  input_tokens  int,
  output_tokens int,
  cost_usd     numeric(10,6),
  metadata     jsonb not null default '{}',
  created_at   timestamptz not null default now()
);
create index on public.ai_usage_log (tenant_id, created_at desc);
```

> **`period_start`/`period_end` no unique:** ambos podem ser `NULL` (relatório sem janela). Em Postgres, `NULL` não colide em unique constraints — se for necessário deduplicar relatórios "período aberto", padronizar as datas na app (nunca gravar `NULL`) ou trocar por um `unique index` com `coalesce`. Definir o comportamento junto do builder de dossiê na Fase 6.

### 1.8 RAG — base de conhecimento

Schema do RAG (autoridade: `03-rag.md`). Duas tabelas: `kb_documents` (1 linha por arquivo ingerido, com progresso por páginas) e `kb_chunks` (chunks vetorizados com FTS em português e cabeçalho contextual). A dimensão do `vector()` é **1536** (`openai/text-embedding-3-small` via OpenRouter) e está **acoplada ao modelo** — ler de `EMBEDDINGS_DIM`/`EMBEDDINGS_MODEL` na app; trocar de modelo exige re-embeddar tudo.

```sql
-- Documento-fonte (1 linha por arquivo ingerido)
create table public.kb_documents (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid references public.tenants(id),   -- NULL = base global
  scope         text not null check (scope in ('global','tenant')),
  title         text not null,
  author        text,
  storage_path  text not null,                        -- bucket/path no Supabase Storage
  source_type   text not null default 'pdf',
  license_note  text,                                 -- declaração de posse legal do material
  embedding_model text,                               -- modelo usado (destrava troca futura)
  status        text not null default 'queued'
                check (status in ('queued','processing','ready','failed')),
  total_pages   int,
  processed_pages int not null default 0,
  chunk_count   int not null default 0,
  error_message text,
  created_by    uuid not null,                        -- auth.uid() de quem subiu
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  constraint scope_tenant check (
    (scope = 'global' and tenant_id is null) or
    (scope = 'tenant' and tenant_id is not null)
  )
);

-- Chunks vetorizados
create table public.kb_chunks (
  id           bigint generated always as identity primary key,
  document_id  uuid not null references public.kb_documents(id) on delete cascade,
  tenant_id    uuid,                                -- desnormalizado p/ filtro rápido; NULL = global
  scope        text not null,
  content      text not null,                       -- texto do chunk (sem o cabeçalho contextual)
  context_header text,                              -- "Livro X — Cap. Y (p. Z)"
  page_start   int,
  page_end     int,
  token_count  int,
  embedding    vector(1536) not null,               -- embed(context_header + content)
  fts          tsvector generated always as
                 (to_tsvector('portuguese',
                    coalesce(context_header,'') || ' ' || content)) stored,
  created_at   timestamptz not null default now()
);

-- Índices
create index kb_chunks_embedding_idx on public.kb_chunks
  using hnsw (embedding vector_cosine_ops);         -- m=16, ef_construction=64 (defaults)
create index kb_chunks_fts_idx on public.kb_chunks using gin (fts);
create index kb_chunks_tenant_idx on public.kb_chunks (tenant_id, scope);
```

> HNSW é preferido a IVFFlat: melhor recall/latência e **não exige tabela pré-populada** (a base começa vazia e cresce documento a documento). Monitorar RAM se a base global passar de ~500k chunks (aí avaliar `halfvec`). A função de busca híbrida (`match_kb_chunks`, RRF vetor + FTS) está documentada em `03-rag.md`.

### 1.9 Chat com IA

Nomes das tabelas do modelo de dados (`chat_conversations`/`chat_messages`), com payload no formato do AI SDK: `chat_messages.parts` é `jsonb` no formato **`UIMessage`** (preserva tool calls para replay/hidratação do `useChat` sem inventar formato próprio), mais uma coluna `citations`. Chat é **privado por usuária dentro do tenant** (ver policies especiais na [seção 2.3](#23-policies-especiais)).

```sql
create table public.chat_conversations (
  id            uuid primary key default gen_random_uuid(),
  tenant_id     uuid not null references public.tenants(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  student_id    uuid references public.students(id) on delete set null, -- chat "sobre um aluno"
  title         text,                                 -- gerado automaticamente (Haiku)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index on public.chat_conversations (tenant_id, user_id, updated_at desc);

create table public.chat_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations(id) on delete cascade,
  tenant_id       uuid not null references public.tenants(id) on delete cascade,
  user_id         uuid not null references auth.users(id) on delete cascade,
  role            text not null check (role in ('user','assistant','system','tool')),
  parts           jsonb not null default '[]', -- formato UIMessage do AI SDK (texto + tool calls)
  citations       jsonb not null default '[]', -- fontes RAG/web usadas na resposta ([KB-n]/[WEB-n])
  usage           jsonb not null default '{}',
  created_at      timestamptz not null default now()
);
create index on public.chat_messages (tenant_id, conversation_id, created_at);
```

### 1.10 Auditoria (LGPD)

Insert-only e imutável para usuárias. RLS permite INSERT (authenticated, tenant próprio) e SELECT (owner); **sem** policies de UPDATE/DELETE.

```sql
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  tenant_id   uuid not null,
  user_id     uuid,
  action      text not null,       -- 'student.create','document.download','student.erase',...
  entity_type text not null,
  entity_id   uuid,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
create index on public.audit_logs (tenant_id, created_at desc);
```

---

## 2. Multi-tenancy e RLS

### 2.1 Resolução de tenant — função helper

Padrão: a associação usuária↔tenant vive em `tenant_members`, resolvida por uma função **`SECURITY DEFINER` em schema não exposto (`private`)**, que sempre filtra por `auth.uid()` internamente. Retorna `setof uuid` — já suporta o futuro modelo 1-usuária-N-tenants sem reescrever nenhuma policy.

```sql
create schema if not exists private;

create or replace function private.user_tenant_ids()
returns setof uuid
language sql
security definer
set search_path = ''
stable
as $$
  select tenant_id
  from public.tenant_members
  where user_id = (select auth.uid())
$$;

revoke all on function private.user_tenant_ids() from public;
grant execute on function private.user_tenant_ids() to authenticated;
```

**Por que a função e não `auth.jwt() -> 'app_metadata' ->> 'tenant_id'`:** a claim no JWT é mais rápida (sem subquery), mas fica **stale até o refresh do token** e engessa o modelo 1-usuária-N-tenants. A função `stable` combinada com `tenant_id in (select …)` tem o subselect executado **uma vez por query** (via initPlan do Postgres), não por linha — performance adequada. Se um dia virar gargalo, migra-se para claim em `app_metadata` (nunca `user_metadata`) como pura otimização, sem tocar no modelo de dados.

### 2.2 Template de policies (aplicar a toda tabela de domínio)

Regras do checklist de segurança do Supabase, obrigatórias em toda policy:

- **`TO authenticated` sempre** + predicado de posse por `tenant_id` (evita BOLA/IDOR).
- **`(select auth.uid())` embrulhado em subselect** (o Postgres o avalia uma vez por query, não por linha — ganho de performance real).
- **UPDATE com `USING` e `WITH CHECK`** — o `USING` decide quais linhas são visíveis para update; o `WITH CHECK` impede reatribuir `tenant_id` para outro tenant.
- **UPDATE exige uma policy de SELECT** para não falhar silenciosamente (retornando 0 linhas).

Bloco padrão das **4 policies** (exemplo com `students`):

```sql
alter table public.students enable row level security;

create policy "students_select" on public.students
for select to authenticated
using ( tenant_id in (select private.user_tenant_ids()) );

create policy "students_insert" on public.students
for insert to authenticated
with check ( tenant_id in (select private.user_tenant_ids()) );

create policy "students_update" on public.students
for update to authenticated
using ( tenant_id in (select private.user_tenant_ids()) )
with check ( tenant_id in (select private.user_tenant_ids()) );

create policy "students_delete" on public.students
for delete to authenticated
using ( tenant_id in (select private.user_tenant_ids()) );
```

O mesmo bloco de 4 policies se aplica diretamente a: `assessments`, `student_conditions`, `sessions`, `session_exercises`, `body_measurements`, `documents`, `ai_reports`, `ai_usage_log`, `kb_documents` (com a nuance de escopo global — ver 2.3). As tabelas de chat e as de conteúdo global/tenant têm predicados adicionais, detalhados abaixo.

### 2.3 Policies especiais

```sql
-- profiles: cada um vê/edita só o próprio
alter table public.profiles enable row level security;
create policy "profiles_select" on public.profiles
for select to authenticated using ( id = (select auth.uid()) );
create policy "profiles_update" on public.profiles
for update to authenticated
using ( id = (select auth.uid()) ) with check ( id = (select auth.uid()) );

-- tenants: membro lê; só owner atualiza
alter table public.tenants enable row level security;
create policy "tenants_select" on public.tenants
for select to authenticated using ( id in (select private.user_tenant_ids()) );
create policy "tenants_update" on public.tenants
for update to authenticated
using ( id in (select tenant_id from public.tenant_members
               where user_id = (select auth.uid()) and role = 'owner') )
with check ( id in (select tenant_id from public.tenant_members
               where user_id = (select auth.uid()) and role = 'owner') );

-- tenant_members: leitura dos próprios vínculos (INSERT feito pelo trigger de signup)
alter table public.tenant_members enable row level security;
create policy "tenant_members_select" on public.tenant_members
for select to authenticated using ( user_id = (select auth.uid()) );

-- exercises: conteúdo GLOBAL (tenant_id IS NULL) + do tenant
alter table public.exercises enable row level security;
create policy "exercises_select" on public.exercises
for select to authenticated
using ( tenant_id is null or tenant_id in (select private.user_tenant_ids()) );
create policy "exercises_insert" on public.exercises
for insert to authenticated
with check ( tenant_id in (select private.user_tenant_ids()) );  -- só cria custom no próprio tenant
create policy "exercises_update" on public.exercises
for update to authenticated
using ( tenant_id in (select private.user_tenant_ids()) )
with check ( tenant_id in (select private.user_tenant_ids()) );
create policy "exercises_delete" on public.exercises
for delete to authenticated
using ( tenant_id in (select private.user_tenant_ids()) );
-- linhas globais (tenant_id IS NULL) são imutáveis para usuárias: nenhum predicado de escrita as alcança.

-- kb_documents: leitura global-ou-tenant; INSERT só do próprio tenant (scope='tenant').
-- scope='global' é criado apenas por script admin (service_role).
alter table public.kb_documents enable row level security;
create policy "kb_documents_select" on public.kb_documents
for select to authenticated
using ( scope = 'global' or tenant_id in (select private.user_tenant_ids()) );
create policy "kb_documents_insert" on public.kb_documents
for insert to authenticated
with check ( scope = 'tenant' and tenant_id in (select private.user_tenant_ids()) );
create policy "kb_documents_delete" on public.kb_documents
for delete to authenticated
using ( scope = 'tenant' and tenant_id in (select private.user_tenant_ids()) );
-- update de status/progresso é feito pelo worker (service_role); sem policy de update p/ authenticated.

-- kb_chunks: leitura global-ou-tenant; escrita SOMENTE pelo pipeline (service_role).
alter table public.kb_chunks enable row level security;
create policy "kb_chunks_select" on public.kb_chunks
for select to authenticated
using ( scope = 'global' or tenant_id in (select private.user_tenant_ids()) );
-- SEM policy de INSERT/UPDATE/DELETE p/ authenticated: chunks só entram via service_role.

-- chat_conversations: privado por usuária DENTRO do tenant
alter table public.chat_conversations enable row level security;
create policy "chat_conversations_select" on public.chat_conversations
for select to authenticated
using ( tenant_id in (select private.user_tenant_ids())
        and user_id = (select auth.uid()) );
create policy "chat_conversations_insert" on public.chat_conversations
for insert to authenticated
with check ( tenant_id in (select private.user_tenant_ids())
             and user_id = (select auth.uid()) );
create policy "chat_conversations_update" on public.chat_conversations
for update to authenticated
using ( tenant_id in (select private.user_tenant_ids())
        and user_id = (select auth.uid()) )
with check ( tenant_id in (select private.user_tenant_ids())
             and user_id = (select auth.uid()) );
create policy "chat_conversations_delete" on public.chat_conversations
for delete to authenticated
using ( tenant_id in (select private.user_tenant_ids())
        and user_id = (select auth.uid()) );

-- chat_messages: mesmo predicado privado (tenant + usuária)
alter table public.chat_messages enable row level security;
create policy "chat_messages_select" on public.chat_messages
for select to authenticated
using ( tenant_id in (select private.user_tenant_ids())
        and user_id = (select auth.uid()) );
create policy "chat_messages_insert" on public.chat_messages
for insert to authenticated
with check ( tenant_id in (select private.user_tenant_ids())
             and user_id = (select auth.uid()) );

-- audit_logs: INSERT (tenant próprio) + SELECT (owner); imutável (sem update/delete)
alter table public.audit_logs enable row level security;
create policy "audit_logs_insert" on public.audit_logs
for insert to authenticated
with check ( tenant_id in (select private.user_tenant_ids()) );
create policy "audit_logs_select" on public.audit_logs
for select to authenticated
using ( tenant_id in (select tenant_id from public.tenant_members
                      where user_id = (select auth.uid()) and role = 'owner') );
```

### 2.4 Índices para RLS

Toda coluna usada em policy precisa de índice. `tenant_id` está indexado em todas as tabelas — na maioria como prefixo de índice composto (`(tenant_id, student_id, …)`), que serve aos dois propósitos (RLS + query de listagem). `tenant_members(user_id)` é indexado à parte: é a query mais quente do sistema, executada em toda avaliação de policy.

### 2.5 Views e funções

- Qualquer view de conveniência (ex.: `student_overview`) deve ser criada com `with (security_invoker = true)` — **views bypassam RLS por padrão**, executando com as permissões do dono.
- Funções RPC (ex.: `match_kb_chunks`): `SECURITY INVOKER` + `set search_path = ''`. A busca híbrida usa, além da RLS das tabelas, um filtro explícito `scope = 'global' or tenant_id = p_tenant_id` como defesa em profundidade (ver `03-rag.md`).
- Rodar os **advisors** (`supabase db advisors` / MCP `get_advisors`) após cada migration com RLS/função/view: pega tabela sem RLS, view sem `security_invoker`, função sem `search_path`, policy sem índice etc.

---

## 3. Modelagem da ficha de avaliação — estruturado vs JSONB

**Critério:** estruturado = tudo que a UI filtra/ordena/plota ou que a IA precisa referenciar com precisão; JSONB = seções de formulário clinicamente ricas, narrativas e sujeitas a evolução de layout.

| Dado | Forma | Racional |
|---|---|---|
| Queixa principal, diagnóstico clínico | colunas `text` | aparecem em listagens e no cabeçalho do prompt da IA |
| Objetivos, contraindicações | `text[]` | filtráveis, viram bullet points no prompt |
| Dor (EVA 0–10) | `smallint` estruturado | série temporal (também em `sessions.pain_level_pre/post`) → gráficos |
| Patologias | tabela `student_conditions` | precisa de status/filtro ("quais alunas com hérnia ativa?") e é insumo direto de segurança p/ IA |
| Anamnese (HPP, HDA, medicamentos, cirurgias, hábitos de vida, sono) | `assessments.anamnesis jsonb` | formulário longo que muda com feedback das usuárias; sem necessidade de query relacional |
| Avaliação postural (vistas anterior/posterior/lateral: achados por segmento) | `assessments.postural_assessment jsonb` | estrutura em árvore; ex. `{"anterior":{"shoulders":"elevação à direita",...}}` |
| Testes físicos/ADM | `assessments.physical_tests jsonb` | idem; valores numéricos padronizados que precisarem de gráfico migram p/ `body_measurements.flexibility` |

**Contrato do JSONB:** os shapes são definidos por schemas **Zod versionados** no app (junto do form). A app sempre grava o formulário completo; a IA recebe o JSONB serializado com labels pt-BR. Isso dá prompt rico sem a rigidez de 60 colunas.

**Reavaliações** são **novas linhas** em `assessments` (`kind='reassessment'`) — nunca update da inicial. Isso cria a linha do tempo clínica que a IA compara ("avaliação inicial vs reavaliação de março").

---

## 4. Triggers

### 4.1 Trigger de signup (decisão híbrida)

Cria as linhas mínimas de identidade numa transação, para que a RLS funcione desde o primeiro request. Roda como `SECURITY DEFINER` no schema `private`, com `search_path` fixo.

```sql
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_tenant_id uuid;
begin
  -- perfil mínimo (nome completo vem do onboarding depois; usa metadata do signup se houver)
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));

  -- tenant próprio
  insert into public.tenants (name)
  values (coalesce(new.raw_user_meta_data ->> 'full_name', 'Meu consultório'))
  returning id into new_tenant_id;

  -- membership owner
  insert into public.tenant_members (tenant_id, user_id, role)
  values (new_tenant_id, new.id, 'owner');

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();
```

> O onboarding depois só faz `UPDATE` de `profiles`/`tenants` sob RLS (nome, CREFITO, telefone, nome do estúdio) e marca `profiles.onboarding_completed_at`. Nenhum `service_role` no caminho do onboarding.

### 4.2 Trigger `updated_at` (padrão)

```sql
create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Aplicar em cada tabela que tem updated_at, ex.:
create trigger set_updated_at
  before update on public.students
  for each row execute function private.set_updated_at();
```

Aplicar o `set_updated_at` em: `tenants`, `profiles`, `students`, `assessments`, `student_conditions`, `exercises`, `sessions`, `body_measurements`, `kb_documents`, `chat_conversations`. (Tabelas sem `updated_at` — `session_exercises`, `documents`, `chat_messages`, `audit_logs`, `ai_usage_log`, `kb_chunks` — não recebem o trigger.)

---

## 5. Supabase Storage

### 5.1 Buckets (todos privados)

Três buckets, todos privados; entrega sempre via signed URLs de curta duração.

| Bucket | Conteúdo | Limites |
|---|---|---|
| `student-documents` | exames, fotos posturais, laudos, termos de consentimento (dado de saúde) | 25 MB/arquivo; mime allowlist: `application/pdf`, `image/jpeg`, `image/png`, `image/webp` |
| `kb-sources` | PDFs/apostilas da base RAG (técnica, nunca dado de saúde) | 100 MB/arquivo; `application/pdf` (docx futuramente) |
| `avatars` | foto de perfil da profissional | 2 MB; imagens |

### 5.2 Convenção de paths — **1º segmento = `tenant_id`** (chave das policies)

```
student-documents/{tenant_id}/{student_id}/{document_id}-{filename-slug}.pdf
kb-sources/{tenant_id}/{source_id}.pdf     -- material do próprio tenant
kb-sources/global/{source_id}.pdf          -- base global (ingerida via service_role)
avatars/{user_id}.jpg
```

> **`kb-sources` usa dois prefixos no mesmo bucket:** `global/` (material curado pelo admin, ingerido via `service_role`) e `{tenant_id}/` (material da profissional). Um único bucket com policy por prefixo é menos superfície de ataque que dois buckets separados.

### 5.3 Policies em `storage.objects`

As policies de `student-documents` seguem o padrão "1º segmento do path = tenant_id". **Upsert no Storage exige INSERT + SELECT + UPDATE** — as três com o mesmo predicado; DELETE idem.

```sql
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
```

Para `kb-sources`, a leitura precisa cobrir tanto `global/` quanto o prefixo do tenant; a escrita fica restrita ao prefixo do tenant (o `global/` é povoado apenas por `service_role`):

```sql
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
-- update/delete de material próprio: mesmo predicado do insert.
```

Para `avatars`, o 1º segmento é `user_id` (não `tenant_id`):

```sql
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
```

**Entrega de arquivos:** sempre via **signed URLs de curta duração (60–300 s)** geradas no servidor; nunca URLs públicas — são dados de saúde. Download de documento gera linha em `audit_logs`. A linha em `public.documents` é a fonte de verdade de metadados; a exclusão remove primeiro o objeto no Storage, depois a linha (ou soft delete + job de limpeza — ver seção 6).

> **Upload direto do browser via signed upload URL:** o binário nunca passa pela função serverless (evita o limite de 4,5 MB de body da Vercel). Fluxo em 2 actions — `criarUrlUpload` (valida tipo/tamanho, gera a URL assinada) → PUT direto do browser → `confirmarUpload` (grava o metadado em `documents`). Detalhes em `05-frontend-ux.md`.

---

## 6. LGPD no banco

Dados de alunos = **dados pessoais sensíveis (saúde — LGPD art. 5º, II / art. 11)**. Papéis: a **profissional é a controladora** dos dados dos seus alunos; o **SaaS é o operador**. Isso orienta o desenho do banco:

1. **Base legal e consentimento** — o tratamento por profissional de saúde ampara-se em tutela da saúde (art. 11, II, "f"), mas registramos consentimento explícito mesmo assim: `students.consent_signed_at` / `consent_version` + upload do termo assinado (`consent_document_id`). A app **bloqueia a geração de relatório de IA sem consentimento registrado** — o envio a subprocessador de IA está citado no termo.
2. **Minimização** — CPF/e-mail são opcionais no schema; coletar só o que a ficha clínica exige.
3. **Residência e criptografia** — projeto Supabase na região **São Paulo (`sa-east-1`)**; criptografia at rest/in transit é default do Supabase; DPA do Supabase assinado.
4. **Fronteira KB × dado de saúde** — a base de conhecimento (`kb_documents`/`kb_chunks`) é **conhecimento técnico e nunca dado de saúde**. Documentos de aluno (`documents`) vivem em bucket/tabela próprios, **não entram em `kb_chunks` e não são vetorizados**; o `extracted_text` deles é injetado direto no prompt daquela análise. Essa separação é regra de arquitetura, não convenção.
5. **Pseudonimização antes da IA** — antes de enviar contexto ao OpenRouter, o builder de dossiê **substitui o nome do aluno** por rótulo genérico e **omite CPF/telefone/e-mail** do prompt (dados clínicos são necessários; identificadores diretos não). Regra de código, detalhada em `04-ia.md` e `07-lgpd-seguranca.md`.
6. **Direito de exclusão (art. 18) — soft delete em duas fases:**
   - **Fase 1 (imediata):** `deleted_at = now()` — o aluno some da UI, mas os dados permanecem por uma janela de 30 dias.
   - **Fase 2 (hard delete após a janela):** função `private.erase_student(student_id)` (SECURITY DEFINER, `service_role`) apaga em cascata as linhas relacionadas + os objetos do Storage por prefixo e grava `audit_logs('student.erase')`.
   - **Conflito legal a sinalizar na UI:** prontuários fisioterapêuticos têm dever de guarda profissional (COFFITO/CFM orientam retenção plurianual). A exclusão a pedido do titular deve ser **decisão informada da controladora** — a UI exibe esse aviso antes de confirmar.
7. **Portabilidade / acesso** — endpoint de "exportar dados do aluno" (JSON/PDF + zip dos documentos) e export completo do tenant (offboarding). As FKs `on delete cascade` já preparam a cascata.
8. **Auditoria** — `audit_logs` imutável (insert-only) para criação/leitura de documentos, exclusões, geração de relatórios de IA e exports.
9. **Encerramento de conta** — apagar o tenant = cascata total (FKs `on delete cascade`) + purge de Storage por prefixo `{tenant_id}/`. Manter expiry curto de JWT (~1h): tokens continuam válidos até expirar.
10. **Segredos** — `service_role` key só em env vars server-side da Vercel (**nunca** `NEXT_PUBLIC_*`); o front usa apenas a publishable key.

---

## 7. Ordem das migrations

Ferramenta única de schema: **Supabase CLI** com migrations SQL versionadas em `supabase/migrations/`, complementada por `supabase gen types typescript` → `src/lib/types/database.types.ts`. Sem Prisma/Drizzle: ~40% deste schema (RLS, `SECURITY DEFINER`, triggers, policies de `storage.objects`, extensão `vector` + HNSW, schema `private`) não é expressável em ORM, e o runtime na Vercel usa `supabase-js`/PostgREST (respeita RLS, dispensa pool de conexões).

**Fluxo de trabalho:**

```bash
supabase init && supabase start          # stack local (Docker)
supabase migration new <nome>            # SEMPRE criar o arquivo via CLI (nunca inventar filename)
# iterar no banco local com execute_sql / supabase db query (não usar apply_migration p/ iterar)
supabase db diff -f <nome>               # consolidar o diff numa migration quando estável
supabase migration list --local          # verificar
supabase db push                         # aplicar em staging/prod (via CI, GitHub Action)
supabase gen types typescript --local > src/lib/types/database.types.ts
```

**Ordem sugerida (alinhada às fases do roadmap):**

| Migration | Conteúdo | Fase |
|---|---|---|
| `0001_extensions` | `vector`, `pg_trgm` | 0 |
| `0002_tenancy` | `tenants`, `profiles`, `tenant_members`; schema `private`; `private.user_tenant_ids()`; trigger de signup; trigger `set_updated_at`; RLS das 3 tabelas | 0 |
| `0003_students` | `students` + índice trigram + `audit_logs` + policies | 2 |
| `0004_assessments` | `assessments`, `student_conditions` + policies | 3 |
| `0005_sessions_exercises` | `exercises` (+ seed do catálogo global), `sessions`, `session_exercises` + policies | 3 |
| `0006_measurements` | `body_measurements` + policies | 3 |
| `0007_documents_storage` | `documents` + FK `consent_document_id`; buckets `student-documents`/`avatars` + policies em `storage.objects` | 4 |
| `0008_rag` | `kb_documents`, `kb_chunks` (HNSW + GIN), `match_kb_chunks` (RRF); bucket `kb-sources` + policies | 5 |
| `0009_ai_reports` | `ai_reports` (com `input_hash` + unique), `ai_usage_log`, `tenants.ai_monthly_limit_usd` | 6 |
| `0010_chat` | `chat_conversations`, `chat_messages` (`parts jsonb`, `citations`) + policies privadas | 7 |
| `0011_lgpd` | `private.erase_student()` (exclusão em 2 fases) | 8 |

> Rodar os **advisors** após cada migration com RLS/função/view. Nunca deixar uma tabela do schema `public` sem RLS habilitada.

---

## 8. Armadilhas conhecidas

Registrar no code review e no onboarding de dev:

- **`service_role` bypassa RLS.** Toda rota/job server-side que usa `service_role` DEVE filtrar `eq('tenant_id', …)` manualmente. Revisar em code review; o grep de todo uso de `service_role` + checklist de filtro de tenant é entregável da Fase 8.
- **`anon` nunca acessa nada.** Nenhuma policy `TO anon` em tabela de domínio.
- **UPDATE sem policy de SELECT falha silenciosamente** (0 linhas afetadas, sem erro). Por isso o template sempre cria as 4 policies.
- **UPDATE precisa de `WITH CHECK` além de `USING`** — sem o `WITH CHECK`, uma usuária poderia reatribuir `tenant_id` de uma linha para outro tenant.
- **Upsert no Storage exige INSERT + SELECT + UPDATE** nas policies de `storage.objects`.
- **Views bypassam RLS por padrão** — criar sempre com `with (security_invoker = true)`.
- **Funções `SECURITY DEFINER` fora de `public`** (schema `private`) e sempre com `set search_path = ''` — evita ataques de search_path e vazamento por exposição via Data API.
- **Dimensão do `vector()` acoplada ao modelo de embedding** — está fixada em 1536 (`text-embedding-3-small`); trocar de modelo exige re-embeddar toda a base. Ler `EMBEDDINGS_DIM`/`EMBEDDINGS_MODEL` na app e gravar `embedding_model` em `kb_documents`.
- **ID de modelo LLM nunca hardcodado nem via alias `latest`** — pinar `anthropic/claude-sonnet-5` via env `OPENROUTER_MODEL` (fallback `anthropic/claude-sonnet-4.6`); gravar o ID real usado em `ai_reports.model`. Ver `04-ia.md`.
- **`NULL` não colide em unique constraints** — atenção ao `unique` de `ai_reports` quando `period_start/end` forem nulos (ver nota na seção 1.7).
- **Chunks de KB só entram via `service_role`** — não há policy de INSERT/UPDATE/DELETE de `kb_chunks` para `authenticated`.
