<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# FisioPilates

SaaS multi-tenant para fisioterapeutas autônomas de Pilates: gestão de alunos, documentos, relatórios de evolução por IA e chat com RAG.

**O planejamento completo está em `docs/plan/`. Leia-o antes de implementar.** Comece por `docs/plan/00-visao-geral.md` e `docs/plan/08-roadmap.md`. As decisões de arquitetura (C1–C19) estão em `docs/plan/01-arquitetura.md` e são vinculantes.

## Stack

- **Next.js 16** (App Router, `src/`, RSC). Middleware agora se chama **`proxy`** (`src/proxy.ts`). React 19.
- **Supabase** (Postgres + Auth + Storage + pgvector), região `sa-east-1`. Migrations via **Supabase CLI** (`supabase/migrations/`), sem ORM.
- **OpenRouter** (LLM + embeddings) via **Vercel AI SDK v6** (`ai` ^6) + `@openrouter/ai-sdk-provider`.
- **QStash** (fila de ingestão da KB) · **Tavily** (busca web).
- UI: Tailwind v4 + shadcn/ui (estilo `radix-lyra`). Forms: react-hook-form + zod 4. Gráficos: recharts.
- Qualidade: **Biome 2** (não ESLint/Prettier), **Vitest 4**.

## Convenções

- **Idioma**: UI 100% pt-BR (strings em `src/lib/textos.ts`); schema/código em inglês (`snake_case` no banco, `camelCase` no TS).
- **Multi-tenancy**: `tenant_id` em toda tabela de domínio + RLS. `service_role` (`src/lib/supabase/admin.ts`) **bypassa RLS** — só em pipelines de servidor, sempre filtrando `tenant_id` na mão.
- **Supabase clients**: `client.ts` (browser), `server.ts` (RSC/actions/route handlers), `admin.ts` (service_role), `proxy.ts` (refresh de sessão).
- **Env**: validado em `src/lib/env.ts` (zod, lazy). Nunca ler `process.env` direto no código de feature.
- **Server Actions** retornam `{ ok: true, data } | { ok: false, erro }`. `tenant_id` nunca vem do form.
- **LGPD** (dados de saúde): pseudonimização obrigatória antes de enviar dados de aluno à IA; `data_collection: 'deny'` no OpenRouter. Ver `docs/plan/07-lgpd-seguranca.md`.

## Comandos

- `npm run dev` · `npm run lint` (Biome) · `npm run typecheck` · `npm run test` (Vitest)
- `npm run db:push` (aplica migrations) · `npm run db:types` (gera `database.types.ts`)
