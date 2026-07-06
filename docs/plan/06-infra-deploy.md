# Infraestrutura e Deploy

> Parte do planejamento do FisioPilates — ver 00-visao-geral.md.

Este documento descreve como o FisioPilates é hospedado, configurado e entregue: hospedagem na Vercel (região `gru1`), banco Supabase (`sa-east-1`), a lista completa de variáveis de ambiente, o pipeline de CI/CD e o fluxo de migrations `local → staging → produção`. Ao final há o checklist de provisionamento da Fase 0.

Toda a superfície de runtime roda em território brasileiro (São Paulo) — decisão de latência e de residência de dados de saúde para LGPD (ver 07-lgpd-seguranca.md).

---

## 1. Vercel

### 1.1 Plano e região

- **Plano Vercel Pro desde o início.** Uso comercial exige plano pago; além disso precisamos de `maxDuration` de até 300s na geração de relatórios de IA, com folga. Não vale o risco de começar no Hobby e migrar sob pressão de produção.
- **Funções na região `gru1` (São Paulo).** Fixada em `vercel.json`:

```json
{
  "regions": ["gru1"]
}
```

Isso mantém o RTT app ↔ banco em ~1–5 ms (Supabase em `sa-east-1`, também em São Paulo) e concentra o processamento no Brasil.

### 1.2 Fluid Compute e `maxDuration` por rota

**Fluid Compute** fica habilitado (padrão de projetos novos). Ele dá cold starts baixos, reuso de instância e o teto de duração estendido que sustenta a geração síncrona de relatórios.

A duração é declarada **por rota**, com `export const maxDuration` no Route Handler correspondente. Valores do MVP:

| Rota | `maxDuration` | Por quê |
|---|---|---|
| `POST /api/ai/analyses` (relatório de evolução) | `300` | Geração síncrona via `generateObject` + Zod, sem fila (decisão de arquitetura). 300s de Fluid Compute cobrem um aluno com muitas sessões com folga. |
| `POST /api/ai/chat` (assistente com RAG) | `120` | `streamText` com tool-calling (`stopWhen: stepCountIs(5)`); streaming dilui a latência percebida. |
| `POST /api/jobs/ingest` (worker de ingestão da KB) | `300` | Processa lotes de até 50 páginas auto-encadeados — cada invocação fica muito abaixo do teto (a fila QStash quebra livros grandes em vários lotes). |
| Demais rotas / Server Actions de CRUD | default | Mutações curtas; não declaram `maxDuration`. |

Notas de runtime:

- **Node runtime em todas as rotas de dados e IA** (`supabase-js` e os SDKs de IA funcionam melhor em Node; `unpdf` exige `runtime = 'nodejs'`). O `proxy` (antigo middleware, renomeado no Next 16 — arquivo `src/proxy.ts`) continua no runtime edge e só toca cookies de sessão.
- **Imports dinâmicos dos SDKs pesados** nos handlers de IA, para manter os handlers leves e o cold start baixo.
- **Uploads nunca passam pela função serverless** (limite de body de 4,5 MB): o browser faz `PUT` direto ao Storage via signed URL. Ver 05-frontend-ux.md e 03-rag.md.

### 1.3 Ambientes e variáveis

As variáveis são cadastradas nos **três ambientes** da Vercel — **Production**, **Preview** e **Development** — e as secretas marcadas como *Sensitive*. A lista completa está na seção 3.

Regra crítica de dados: **Preview e Development nunca apontam para o banco de produção.** Eles usam o **projeto Supabase de staging** (seção 2.2). Produção é o único ambiente com credenciais do projeto Supabase de produção.

### 1.4 Deployment Protection nos previews

Cada Pull Request gera um Preview Deployment automático. Como um preview pode conter dados de saúde de staging, ative **Deployment Protection (Vercel Authentication)** nos previews: as URLs de preview passam a exigir login na Vercel, nunca ficando públicas. Isso é requisito de LGPD, não conforto.

### 1.5 Outras configurações do projeto

- Framework preset **Next.js**; build padrão (`next build`), sem override.
- Domínio custom + HTTPS. O domínio (e o wildcard de preview, se os previews usarem auth de staging) precisa estar cadastrado no Supabase Auth em **Site URL** e **Redirect URLs** — incluindo as rotas `/auth/confirm` e `/auth/callback`.
- **Web Analytics + Speed Insights** habilitados (sem cookies — ok para LGPD).
- Proteção antibot no `/cadastro` via **Turnstile** (Fase 8), suportada nativamente pelo Supabase Auth.

---

## 2. Supabase

### 2.1 Projeto de produção — `sa-east-1`

- **Região `sa-east-1` (São Paulo).** Decisão irreversível tomada na criação do projeto: não se muda a região depois. Mantém os dados de saúde em território brasileiro e o RTT app ↔ banco mínimo.
- Extensões habilitadas via migration `0001_extensions`: `vector` (pgvector, para o RAG) e `pg_trgm` (busca por nome de aluno).
- Migrations, RLS, triggers, índices HNSW e políticas de Storage são versionados como **migrations do Supabase CLI** (`supabase/migrations/`). Não usamos ORM — ~40% do schema (RLS, triggers, HNSW, storage policies) não é expressável em Prisma/Drizzle.
- Tipos TypeScript gerados a partir do schema (`npm run db:types` → `src/lib/types/database.types.ts`), versionados no repo e atualizados junto de cada migration.

### 2.2 Projeto de staging para previews e CI

Um **segundo projeto Supabase**, também em `sa-east-1`, serve exclusivamente aos ambientes **Preview** e **Development** da Vercel e ao job de migrations do CI. Nunca contém dados reais de produção.

- Recebe as migrations automaticamente via CI a cada merge em `main` (`supabase db push` — seção 4).
- É o banco contra o qual os Preview Deployments rodam, garantindo que nenhuma URL de preview toque produção.
- Alternativa equivalente aceitável: **Supabase Branching** (branch efêmero por PR) em vez de um projeto dedicado. O projeto dedicado é o caminho padrão do MVP por ser mais simples de operar com um único dev.

### 2.3 Storage

Três buckets privados (todos com signed URLs curtas; nada público). Criados por migration junto das políticas de `storage.objects`:

- `student-documents` — exames, fotos posturais, laudos, termos (prefixo por `tenant_id`).
- `kb-sources` — materiais da base de conhecimento (prefixo `global/` para a base curada do admin, `{tenant_id}/` para o material de cada profissional).
- `avatars` — foto de perfil.

Detalhe das políticas em 02-banco-de-dados.md.

---

## 3. Variáveis de ambiente (lista completa)

Esta lista **é a fonte de verdade** e deve bater exatamente com o `.env.example` do repositório. `src/lib/env.ts` valida todas com zod no boot (falha de build/boot com mensagem clara em vez de erro silencioso em produção); nunca ler `process.env` direto no código de feature.

| Variável | Escopo | Ambientes | Descrição |
|---|---|---|---|
| `APP_URL` | pública | todos | URL canônica da aplicação. Usada nos callbacks de auth (`emailRedirectTo`) e pelo worker de ingestão para se auto-encadear. Local: `http://localhost:3000`. |
| `NEXT_PUBLIC_SUPABASE_URL` | pública | todos | URL do projeto Supabase (produção usa o projeto de produção; preview/dev usam o de staging). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | pública | todos | Anon/publishable key. A RLS é quem protege os dados — esta key não concede acesso indevido. |
| `SUPABASE_SERVICE_ROLE_KEY` | secreta | todos | Service role — **bypassa RLS**. Só importável em `src/server/**` e `src/lib/supabase/admin.ts` (onboarding não precisa; ingestão de chunks da KB e scripts admin usam). Sempre com filtro manual de `tenant_id`. |
| `OPENROUTER_API_KEY` | secreta | todos | Chave única do OpenRouter — serve LLM **e** embeddings. |
| `OPENROUTER_MODEL` | secreta | todos | Modelo principal, ID **pinado**: `anthropic/claude-sonnet-5`. Nunca alias `latest` em produção. |
| `OPENROUTER_MODEL_FALLBACK` | secreta | todos | Fallback automático quando o principal falha (`extraBody.models`): `anthropic/claude-sonnet-4.6`. |
| `OPENROUTER_MODEL_CHEAP` | secreta | todos | Modelo barato para tarefas auxiliares (reescrita/geração de queries, títulos de conversa, sumarização): `anthropic/claude-haiku-4.5`. |
| `EMBEDDINGS_MODEL` | secreta | todos | `openai/text-embedding-3-small`, via endpoint `POST /v1/embeddings` OpenAI-compatível do OpenRouter. **Trocar de modelo exige re-embedding de toda a base.** |
| `EMBEDDINGS_DIM` | secreta | todos | `1536`. A dimensão trava a coluna `vector(...)` — não hardcodar no código. |
| `QSTASH_TOKEN` | secreta | todos | Token de publicação de mensagens no QStash (enfileira lotes de ingestão da KB). |
| `QSTASH_CURRENT_SIGNING_KEY` | secreta | todos | Chave de assinatura atual — o worker `POST /api/jobs/ingest` verifica a assinatura de cada requisição do QStash. |
| `QSTASH_NEXT_SIGNING_KEY` | secreta | todos | Próxima chave de assinatura (usada durante rotação de chaves do QStash). |
| `TAVILY_API_KEY` | secreta | todos | Busca web complementar ao RAG (fallback com allowlist de fontes de saúde). |

Observações:

- As três variáveis do Supabase e o `APP_URL` mudam de valor entre Production (projeto de produção) e Preview/Development (projeto de staging). As chaves de OpenRouter/QStash/Tavily podem ser compartilhadas entre ambientes, mas o ideal é uma chave de staging separada onde o provedor permitir, para isolar quotas.
- Migração de provedor de embeddings (para OpenAI direto) é troca de `baseURL` + as duas envs `EMBEDDINGS_MODEL`/`EMBEDDINGS_DIM` — o endpoint é OpenAI-compatível. Decisão travada antes da migration que cria `kb_chunks`.

---

## 4. CI/CD — GitHub Actions

O pipeline vive em `.github/workflows/ci.yml` e tem dois jobs.

### 4.1 Job `quality` — em todo PR e push para `main`

Roda em Node 22 com cache de npm:

1. `npm ci`
2. `npx biome ci .` — lint + checagem de formatação (Biome 2.x; sem ESLint/Prettier).
3. `npx tsc --noEmit` — typecheck (TypeScript strict + `noUncheckedIndexedAccess`).
4. `npm run test -- --run` — Vitest 4 (unit + validators + componentes críticos com RTL).

Esses três passos são o **gate obrigatório**: um PR só entra com CI verde. Os testes E2E (Playwright, com IA mockada) entram no pipeline na Fase 8 e rodam no merge para `main` (ver 09-testes-qualidade.md).

### 4.2 Job `db-staging` — migrations em staging, só em `main`

Depende de `quality` e roda apenas em `push` para `main` (`if: github.ref == 'refs/heads/main'`). Usa o `supabase/setup-cli`, faz `supabase link` no projeto de staging e `supabase db push`.

Secrets necessários no repositório (configurados na Fase 0):

- `SUPABASE_ACCESS_TOKEN` — token de acesso da conta Supabase.
- `STAGING_DB_PASSWORD` — senha do banco do projeto de staging.
- `STAGING_PROJECT_REF` — ref do projeto de staging.

Enquanto `STAGING_PROJECT_REF` não estiver configurado, o job se auto-pula (não quebra o CI), permitindo abrir o repositório antes de o staging existir.

**Produção não é migrada pelo CI.** O push para o projeto de produção é uma operação manual e deliberada (seção 5) — evita que um merge acidental altere o banco com dados reais de saúde.

---

## 5. Fluxo de migrations: local → staging → produção

Uma migration percorre três estágios, sempre na mesma ordem:

1. **Local.** O dev cria a migration (`supabase migration new <nome>`), sobe o stack local (`supabase start`) e aplica com `npm run db:reset` (recria do zero, garantindo que a sequência de migrations é reprodutível). Regenera os tipos com `npm run db:types`. Roda os testes SQL de isolamento RLS localmente (ver 09-testes-qualidade.md).
2. **Staging.** Ao mergear na `main`, o CI (`db-staging`) aplica a migration no projeto de staging via `supabase db push`. Os Preview Deployments passam a rodar contra o schema novo. Rodar `supabase db advisors` (via MCP/CLI) contra staging para pegar findings de segurança/performance **a cada migration**.
3. **Produção.** Passo manual e revisado, feito pelo dev após validar staging:

   ```bash
   supabase link --project-ref <PROD_PROJECT_REF>
   supabase db push
   ```

   Só depois disso o deploy de produção na Vercel (que já foi promovido a partir de `main`) passa a operar sobre o schema novo. Rodar os advisors também contra produção.

Convenções:

- Migrations são **imutáveis depois de aplicadas em staging/produção**: correção é sempre uma nova migration, nunca editar uma já aplicada.
- Cada migration que mexe em schema acompanha a regeneração de `database.types.ts` no mesmo PR.
- Ordem inicial fixa (Fase 0): `0001_extensions` (vector, pg_trgm) → `0002_tenancy` (tenants, profiles, tenant_members, trigger de signup, `private.user_tenant_ids()`, trigger de `updated_at`). Detalhes em 02-banco-de-dados.md.

---

## 6. Checklist de provisionamento — Fase 0

Marcadores do que precisa existir para a Fase 0 fechar ("Hello World" autenticável em produção, PR abrindo preview com CI verde). Alinha com os entregáveis da Fase 0 em 08-roadmap.md.

**Repositório e app**

- [ ] Projeto scaffoldado (Next 16 App Router, `src/`, TS strict + `noUncheckedIndexedAccess`, Tailwind v4, shadcn/ui estilo `radix-lyra`, Biome 2.x, Vitest 4). — já feito no scaffold inicial.
- [ ] `src/lib/env.ts` validando todas as envs com zod; `.env.example` completo e igual à seção 3.
- [ ] `.github/workflows/ci.yml` com os jobs `quality` e `db-staging`.
- [ ] `docs/plan/` completo commitado.

**Supabase**

- [ ] Projeto de **produção** criado em `sa-east-1`.
- [ ] Projeto de **staging** criado em `sa-east-1` (ou Branching habilitado).
- [ ] `supabase init` + stack local funcionando (`supabase start`).
- [ ] Migrations `0001_extensions` e `0002_tenancy` aplicadas em local, staging e produção.
- [ ] `npm run db:types` gerando `database.types.ts`.
- [ ] `supabase db advisors` sem findings críticos em staging e produção.
- [ ] Buckets `student-documents`, `kb-sources`, `avatars` planejados (criados nas fases que os usam — 4 e 5).

**Vercel**

- [ ] Projeto Vercel Pro criado, preset Next.js.
- [ ] `vercel.json` com `regions: ["gru1"]`.
- [ ] Fluid Compute habilitado.
- [ ] Variáveis da seção 3 cadastradas nos 3 ambientes (secretas marcadas *Sensitive*); Preview/Development apontando para o Supabase de **staging**, Production para o de **produção**.
- [ ] Deployment Protection (Vercel Authentication) ativado nos previews.
- [ ] Domínio custom + HTTPS; Site URL e Redirect URLs (`/auth/confirm`, `/auth/callback`) configurados no Supabase Auth.
- [ ] Web Analytics + Speed Insights habilitados.

**CI/CD**

- [ ] Secrets `SUPABASE_ACCESS_TOKEN`, `STAGING_DB_PASSWORD`, `STAGING_PROJECT_REF` configurados no repositório.
- [ ] Um PR de teste abre preview na Vercel com CI verde.

**Critério de aceite da Fase 0:** `git clone` → `npm i` → app roda local contra o Supabase local; PR abre preview na Vercel com CI verde; migration aplicada em staging e produção; advisors do Supabase sem findings críticos.
