# Roadmap de Implementação

> Parte do planejamento do FisioPilates — ver 00-visao-geral.md.

Este documento define o plano de execução do MVP em fases sequenciais. Cada fase termina **deployada em produção e testável de ponta a ponta**, com entregáveis, dependências, critérios de aceite e estimativa em dias úteis (dev-days). Ao final há a tabela de riscos e o backlog pós-MVP.

**Premissa:** 1 dev full-time. As estimativas já incluem os testes da própria fase. O total estimado é **43–56 dev-days (~9–11 semanas para 1 dev)**.

---

## Fase 0 — Scaffold e infraestrutura (3–4 dias)

**Objetivo:** repositório, banco, CI e deploy funcionando; "Hello World" autenticável em produção.

O scaffold local já foi executado (itens marcados como concluídos abaixo). O que resta desta fase é essencialmente **provisionamento** dos serviços externos (Supabase, Vercel, QStash, Tavily) e a ativação do CI em repositório remoto.

**Entregáveis:**
- [x] `create-next-app` — Next.js 16 (App Router), TS strict + `noUncheckedIndexedAccess`, Tailwind v4, `src/`
- [x] shadcn/ui inicializado (estilo `radix-lyra`) + tokens de marca em `globals.css`; lucide, sonner, date-fns/ptBR
- [x] Biome 2.x (`biome.json` com domains next/react); scripts `lint`/`format`/`check`
- [x] Estrutura de pastas do frontend (route groups `(auth)`/`(app)`, `src/server/` com `server-only`, `lib/validators/`, `lib/supabase/{client,server,proxy,admin}.ts`)
- [x] `docs/plan/` completo commitado (lista em 00-visao-geral.md)
- [ ] Projeto Supabase **sa-east-1** criado + `supabase init/start` local; migrations `0001_extensions` (vector, pg_trgm) e `0002_tenancy` (tenants, profiles, tenant_members, trigger de signup, `private.user_tenant_ids()`, trigger `updated_at`)
- [ ] `supabase gen types typescript` → `lib/types/database.types.ts` + script `db:types`
- [ ] `lib/env.ts` com validação zod (zod 4) de todas as envs; `.env.example` completo (envs do frontend + `OPENROUTER_MODEL`, `EMBEDDINGS_MODEL`/`EMBEDDINGS_DIM`, `QSTASH_*`, `TAVILY_API_KEY`)
- [ ] Projeto Vercel Pro: região `gru1`, Fluid Compute, envs nos 3 ambientes, Deployment Protection em previews; projeto Supabase de staging para previews
- [ ] QStash e Tavily provisionados (chaves emitidas, colocadas nas envs dos 3 ambientes)
- [ ] CI GitHub Actions em repositório remoto: `biome check` + `tsc --noEmit` + `vitest run` (Vitest 4) em PR; `supabase db push` para staging via CI

**Dependências:** nenhuma.

**Critérios de aceite:** `git clone` → `npm i` → app roda local contra Supabase local; PR abre preview na Vercel com CI verde; migration aplicada em staging e produção; advisors do Supabase sem findings críticos.

---

## Fase 1 — Auth, onboarding e shell do app (4–5 dias)

**Objetivo:** profissional cria conta, confirma e-mail, completa onboarding e vê o app logado — com isolamento de tenant ativo no banco.

**Entregáveis:**
- [ ] Telas `(auth)`: `/login`, `/cadastro` (com aceite LGPD), `/recuperar-senha`, `/redefinir-senha`; rotas `auth/confirm` e `auth/callback`
- [ ] `src/proxy.ts` (ex-`middleware.ts`, renomeado no Next 16) com `updateSession` + redirects (UX, não segurança)
- [ ] Trigger de signup validado — o trigger cria `profiles` + `tenants` + `tenant_members` mínimos numa transação; o onboarding apenas completa os dados via `UPDATE`
- [ ] `/onboarding`: action que completa perfil (nome, CREFITO, telefone, nome do estúdio) e marca `onboarding_completed_at`
- [ ] `requireUser()`/`requireTenant()` em `src/server/auth.ts` com `React.cache`
- [ ] Layout `(app)`: sidebar (Início · Alunos · Assistente · Base de Conhecimento · Configurações), header, bottom nav mobile
- [ ] `/dashboard` placeholder (saudação + empty states) e `/configuracoes` (perfil, alterar senha, logout)
- [ ] Policies RLS de `tenants`/`profiles`/`tenant_members` + testes SQL de isolamento (2 usuárias não se enxergam)

**Dependências:** Fase 0.

**Critérios de aceite:** fluxo completo cadastro→e-mail→onboarding→dashboard em produção; teste automatizado de RLS provando que usuária A não lê tenant de B; logout/recuperação de senha funcionam.

---

## Fase 2 — Gestão de alunos (CRUD) (4–5 dias)

**Objetivo:** a profissional gerencia sua carteira de alunos — primeira entrega com valor real.

**Entregáveis:**
- [ ] Migration `students` + `audit_logs` + policies (template de 4 policies) + índice trigram de nome
- [ ] `/alunos`: lista com busca (debounce), cards mobile/tabela desktop, filtro ativo/inativo, link WhatsApp, empty state
- [ ] `/alunos/novo`: form curto obrigatório + seções colapsadas; validators zod compartilhados (`lib/validators/aluno.ts`), mensagens pt-BR
- [ ] Ficha `/alunos/[id]` com cabeçalho fixo + estrutura de abas por rota (Dados ativa; demais como placeholders "em breve")
- [ ] Editar, arquivar/reativar, excluir com ConfirmDialog + aviso LGPD (soft delete `deleted_at`)
- [ ] Registro de consentimento (`consent_signed_at`/`consent_version`) no cadastro
- [ ] `audit_logs` em create/delete de aluno
- [ ] Vitest nos validators; convenções de Server Action estabelecidas (retorno `{ok, data|erro}`, `revalidatePath`, tenant nunca do form)

**Dependências:** Fase 1.

**Critérios de aceite:** CRUD completo em produção; busca responde <300ms percebidos; aluno de um tenant invisível para outro (teste E2E); consentimento persistido.

---

## Fase 3 — Avaliações, sessões, exercícios e medidas (7–9 dias)

**Objetivo:** o núcleo clínico — ficha de avaliação, registro rápido de sessões e séries temporais que alimentarão gráficos e IA.

**Entregáveis:**
- [ ] Migrations: `assessments`, `student_conditions`, `exercises` (+ seed do catálogo global ~80–120 exercícios de Pilates), `sessions`, `session_exercises`, `body_measurements` + policies (inclui policy global-ou-tenant em `exercises`)
- [ ] Aba Avaliação: form longo (RHF) — anamnese/postural/testes como JSONB com schemas Zod versionados; queixa, objetivos, contraindicações e EVA estruturados; reavaliação = nova linha (`kind='reassessment'`); histórico com datas
- [ ] Gestão de condições/patologias do aluno (CRUD inline na avaliação)
- [ ] Aba Sessões: timeline (mais recente primeiro) com exercícios, molas/carga, dor pré/pós, observações
- [ ] `/alunos/[id]/sessoes/nova`: form otimizado pós-aula — autocomplete de exercícios, lista dinâmica, **"Repetir última sessão"**, "salvar e registrar outra aluna"
- [ ] Registro de medidas corporais (peso, circunferências, flexibilidade — chaves canônicas)
- [ ] Dashboard real: alunos ativos, sessões da semana, "precisam de atenção" (15+ dias sem sessão), atalho "Registrar sessão"
- [ ] Testes: validators + componente `SessaoForm` (RTL)

**Dependências:** Fase 2.

**Critérios de aceite:** fluxo "avaliar aluna nova → registrar 3 sessões → reavaliar" completo no celular em <2 min por sessão; duplicar última sessão funciona; dados de EVA/medidas consultáveis por série temporal (query verificada).

---

## Fase 4 — Documentos e Storage (4–5 dias)

**Objetivo:** exames, fotos posturais e termos anexados ao aluno, com segurança de dado de saúde.

**Entregáveis:**
- [ ] Migration `documents` + FK `consent_document_id`; buckets `student-documents`/`avatars` + policies em `storage.objects` (prefixo tenant, INSERT+SELECT+UPDATE p/ upsert)
- [ ] Fluxo de upload em 2 actions: `criarUrlUpload` (valida tipo/tamanho, gera signed upload URL) → PUT direto do browser com progresso → `confirmarUpload` (grava metadado) — nunca passa pela função serverless
- [ ] Aba Documentos: grade por categoria (Exames, Fotos posturais com comparação lado a lado por `taken_at`, Laudos, Termos, Outros), preview imagem/PDF, download por signed URL curta (60–300s)
- [ ] Extração de texto no upload (`unpdf`, runtime nodejs) → `documents.extracted_text`; falha explícita pt-BR para PDF escaneado
- [ ] Pré-processamento de fotos no upload (sharp, ~1568px) — prepara a Fase 8 (vision)
- [ ] `audit_logs` em upload/download/exclusão de documento
- [ ] Upload de termo de consentimento assinado vinculado ao aluno

**Dependências:** Fase 2 (aluno); independente da 3 (pode paralelizar se houver 2 devs).

**Critérios de aceite:** upload de 20MB com progresso funciona no celular; URL de documento expira (teste manual); usuária B não acessa objeto de A nem por URL adivinhada; audit registra downloads.

---

## Fase 5 — RAG: ingestão e retrieval (5–7 dias)

**Objetivo:** base de conhecimento funcionando — upload de PDF até busca híbrida retornando chunks relevantes com citação de página.

**Entregáveis:**
- [ ] Migrations: `kb_documents` + `kb_chunks` (fts, context_header, páginas, HNSW cosine + GIN) + `match_kb_chunks` híbrida RRF + policies (SELECT global-ou-tenant; escrita de chunks só service_role)
- [ ] Bucket `kb-sources` (prefixo `global/` e `{tenant_id}/`) + policies
- [ ] QStash configurado; worker `POST /api/jobs/ingest` (assinatura verificada, `maxDuration=300`): download → unpdf por página → chunking recursivo 500–800 tokens + cabeçalho contextual → embeddings em lote (OpenRouter, `openai/text-embedding-3-small` 1536d via `POST /v1/embeddings`) → insert; lotes de 50 páginas auto-encadeados, delete-antes-de-inserir (idempotência)
- [ ] `/conhecimento`: upload (mesmo fluxo signed URL), lista com status Processando (progresso por páginas) / Pronto / Erro, excluir (cascata remove chunks), aviso legal "apenas materiais que você possui legalmente" + `license_note`
- [ ] Ingestão da base global via script admin (service_role) com 2–3 materiais seed
- [ ] Módulo `lib/ai/rag.ts`: `ragSearch(query, {tenantId, k})` + integração Tavily com gatilho de fallback (similaridade <0.5) e cache 7 dias — **testado via script/endpoint interno**, ainda sem UI de chat
- [ ] Golden set: ~15 perguntas de fisio/Pilates com chunks esperados, rodadas como teste de qualidade de retrieval

**Dependências:** Fase 0 (infra); Fase 4 recomendada antes (reusa fluxo de upload).

**Critérios de aceite:** livro de 300 páginas ingerido sem timeout com progresso visível; retry do QStash não duplica chunks; `match_kb_chunks` retorna resultado certo para ≥80% do golden set; chunk de tenant A nunca aparece para B (teste).

---

## Fase 6 — IA: relatórios de evolução + gráficos (6–8 dias)

**Objetivo:** o diferencial do produto — botão "Gerar análise com IA" produz relatório estruturado de evolução, com guardrails e controle de custo.

**Entregáveis:**
- [ ] Migrations: `ai_reports` (`structured jsonb`, `input_snapshot`, `input_hash` + unique, status) e `ai_usage_log`; campo `ai_monthly_limit_usd` em `tenants`
- [ ] `lib/ai/client.ts` (OpenRouter + AI SDK v6, `MODELS`/`FALLBACK_MODELS`, `data_collection:'deny'`, `usage:{include:true}`), `guardrails.ts`, `prompts/analise-evolucao.ts`, `schemas/relatorio.ts` (Zod com `aviso` literal)
- [ ] Builder de dossiê server-side: avaliações + condições + sessões do período (sumarização Haiku se >40) + medidas + `extracted_text` de docs + multi-query RAG (Haiku, 3–5 queries, dedupe, ~10–12 chunks) — **pseudonimizado** (sem nome/CPF/contato)
- [ ] `POST /api/ai/analyses` (`maxDuration=300`): quota → cache por `input_hash` → `generateObject` (síncrono, sem streaming, sem fila) com retry/backoff → persiste; polling de status na UI
- [ ] Aba Evolução: gráficos Recharts (dor ao longo das sessões, frequência mensal, progressão por exercício via `resistance_level`, medidas) + lista de relatórios + geração com estado de progresso
- [ ] Relatório nasce **rascunho** → profissional revisa e aprova (humano no circuito); banner fixo de disclaimer
- [ ] `assertQuota()` + registro de uso no `onFinish`; painel "Uso de IA neste mês" em Configurações
- [ ] Erros mapeados pt-BR (429/503/402/cota) + alerta interno para crédito OpenRouter

**Dependências:** Fases 3 (dados), 4 (extracted_text) e 5 (RAG).

**Critérios de aceite:** relatório gerado em <90s para aluno com 30 sessões, com todas as seções do schema, citando fontes da KB, sem inventar dados (validado com aluno de dados esparsos → "não há registro"); duplo clique não gera/cobra 2x; regerar sem mudança de dados retorna cache; custo real logado por relatório.

---

## Fase 7 — Chat assistente com RAG (5–6 dias)

**Objetivo:** a profissional tira dúvidas técnicas em linguagem natural, com fontes citadas.

**Entregáveis:**
- [ ] Migrations: `chat_conversations` + `chat_messages` (`parts jsonb` no formato `UIMessage`, `citations`) + policies (privadas por usuária dentro do tenant)
- [ ] `POST /api/ai/chat` (`maxDuration=120`): `streamText` + tools `buscar_conhecimento`, `buscar_ficha_aluno` (snapshot do aluno via RLS), `buscar_web` (Tavily), `stopWhen: stepCountIs(5)`; prompt caching Anthropic no system estável; `consumeStream()` garantindo gravação de uso
- [ ] `/assistente`: `useChat` com streaming, histórico de conversas (drawer), hidratação de conversas antigas, sugestões iniciais, chips de fontes `[KB-n]` (expandem trecho) e `[WEB-n]` (link externo), subtítulo permanente de disclaimer
- [ ] Título automático via Haiku; sumarização de histórico >30 mensagens
- [ ] Quota compartilhada com relatórios; erro amigável + `reload()` no `useChat`

**Dependências:** Fases 5 e 6 (reusa rag.ts, client, quota, usage).

**Critérios de aceite:** pergunta técnica responde com streaming citando material da base; "como está a evolução da Maria?" traz dados reais do tenant (e só dele); pergunta fora da base dispara web com sinalização "(fonte: web)"; pergunta fora de escopo é recusada com gentileza; conversa persiste e recarrega.

---

## Fase 8 — Vision, LGPD completo e polimento (5–7 dias)

**Objetivo:** fechar o MVP: análise postural por fotos, direitos do titular, hardening e qualidade.

**Entregáveis:**
- [ ] Vision no relatório: seção postural opcional quando há fotos no período (signed URLs 5 min como content parts, máx. 6 fotos, prompt de limitações)
- [ ] LGPD: exportar dados do aluno (JSON/PDF + zip de documentos), exportar tenant completo (offboarding), `private.erase_student()` em duas fases (soft 30 dias → hard delete + purge Storage) com aviso de dever de guarda COFFITO na UI, exclusão de conta (double-confirm, cascata + purge)
- [ ] Política de privacidade + termo de consentimento modelo (OpenRouter/Anthropic como suboperadores)
- [ ] E2E Playwright (login→dashboard; criar aluno; registrar sessão; IA mockada) no CI
- [ ] `supabase db advisors` limpo; revisão de todo uso de service_role (grep + checklist de filtro de tenant)
- [ ] Polimento: empty states ilustrados, toasts consistentes, mobile na maca revisado, captcha Turnstile no cadastro, Web Analytics/Speed Insights, Sentry
- [ ] Backlog pós-MVP documentado (ver seção final deste documento)

**Dependências:** todas as anteriores.

**Critérios de aceite:** exclusão de aluno remove tudo (banco + Storage) após a janela, com audit; export baixa pacote completo; suíte E2E verde no CI; zero findings críticos nos advisors; smoke test completo do produto por uma fisioterapeuta real (teste de usabilidade informal).

---

## Total e paralelização

**Total estimado: 43–56 dev-days (~9–11 semanas para 1 dev).**

Fases 3 ∥ 4 e partes de 5 são paralelizáveis com um segundo dev (encurta ~2 semanas).

---

## Riscos e mitigações (top 8)

| # | Risco | Impacto | Mitigação |
|---|---|---|---|
| R1 | **Vazamento cross-tenant** (dado de saúde de aluna de A visto por B) — pior cenário do produto | Crítico | RLS em 100% das tabelas + policies de Storage por prefixo; service_role só em pipelines com filtro manual revisado (checklist Fase 8); testes automatizados de isolamento desde a Fase 1; advisors a cada migration. |
| R2 | **LGPD / dados sensíveis enviados à IA** | Crítico/legal | Pseudonimização obrigatória no builder de dossiê (regra de código, não convenção); `data_collection:'deny'` no OpenRouter; região sa-east-1; consentimento bloqueante para gerar relatório; suboperadores documentados; previews nunca contra produção. |
| R3 | **Timeout/falha na ingestão de livros grandes na Vercel** | Alto | QStash com lotes de 50 páginas auto-encadeados (cada invocação ≪ 300s), retries + DLQ, idempotência por delete-antes-de-inserir, progresso visível na UI; falha explícita para PDF escaneado. |
| R4 | **Custo de IA descontrolado** | Alto | Quota mensal por tenant (`assertQuota`), cache de relatório por `input_hash` + constraint de idempotência, prompt caching Anthropic, Haiku para tarefas baratas, tetos de `maxOutputTokens`, custo real logado por operação, orçamento a preço cheio ($3/$15). |
| R5 | **Qualidade do retrieval em pt-BR insuficiente** (IA responde mal → perda de confiança do público leigo) | Alto | Busca híbrida FTS-português + RRF; golden set de ~15 perguntas como teste de regressão desde a Fase 5; plano B escalonado: `text-embedding-3-large` → reranker (hook previsto); regra de prompt "não invente conduta clínica" + citações clicáveis. |
| R6 | **Lock-in da dimensão do embedding** (trocar modelo = re-embeddar tudo) | Médio | `EMBEDDINGS_MODEL`/`EMBEDDINGS_DIM` via env, coluna `embedding_model` em `kb_documents`, endpoint OpenAI-compatible (migração de provedor = 2 env vars); decisão travada antes da migration `kb_chunks`. |
| R7 | **Deriva de modelo/preço no OpenRouter** (fim do preço intro do Sonnet 5; IDs mudam) | Médio | ID pinado via env `OPENROUTER_MODEL` (nunca alias `latest`), fallback automático `models:[claude-sonnet-4.6]`, monitoração de `limit_remaining` + auto-top-up, orçamento já a preço cheio. |
| R8 | **Risco regulatório/clínico da IA** (interpretação como diagnóstico; responsabilidade COFFITO) | Médio/legal | Guardrails em 4 camadas (system prompt inegociável, `z.literal` do disclaimer, relatório rascunho→aprovação humana, banner permanente); IA nunca exposta ao aluno final; aviso de dever de guarda no fluxo de exclusão. |

---

## Backlog pós-MVP

Itens conscientemente fora do escopo do MVP, registrados para priorização futura:

- **Export PDF do relatório** — renderização do `structured`/`content_md` do relatório de evolução em PDF para impressão e envio ao aluno.
- **OAuth Google** — login social além de e-mail/senha.
- **OCR de PDFs escaneados** — extração de texto de exames digitalizados sem camada de texto (hoje falham explicitamente na Fase 4).
- **Reranker** — reordenação dos resultados de retrieval (plano B de qualidade escalonado a partir da busca híbrida, já com hook previsto).
- **Comparação de avaliações** — visão lado a lado de duas avaliações/reavaliações do mesmo aluno ao longo do tempo.
- **Billing / Stripe** — cobrança, planos e assinatura do SaaS.
- **Times / estúdios** — múltiplas profissionais por tenant (o schema já nasce com `tenant_members` preparado para 1-usuária-N-tenants).
