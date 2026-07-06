# Testes e Qualidade

> Parte do planejamento do FisioPilates — ver 00-visao-geral.md.

Estratégia de testes e gates de qualidade do MVP. A filosofia é enxuta e proporcional a um time de 1 dev: testar o que quebra silenciosamente e o que, se falhar, é catastrófico — sobretudo **isolamento entre tenants** (dados de saúde) e **regras de negócio dos forms**. Não buscamos cobertura ampla de UI nem visual regression nesta fase.

Ferramentas já no repositório: **Vitest 4** (jsdom, globals, alias `@`) e **React Testing Library**. Os testes de isolamento RLS são SQL rodados pelo Supabase CLI. Playwright entra na Fase 8.

---

## 1. Pirâmide de testes do projeto

Da base (muitos, baratos, rápidos) ao topo (poucos, caros, lentos):

### 1.1 Unit — Vitest

A base da pirâmide. Roda em todo PR (`npm run test -- --run`).

- **`src/lib/validators/*`** — todos os schemas zod dos forms (aluno, avaliação, sessão, documento, chat, onboarding). São a regra de negócio dos formulários; testar entradas válidas, inválidas e limites, e conferir as mensagens de erro em pt-BR. Cada validator novo nasce com testes na mesma fase (requisito desde a Fase 2).
- **Formatadores pt-BR** (`src/lib/utils.ts`) — data, telefone, CPF.
- **Helpers puros de `src/server/services/**`** — lógica sem I/O: builder de dossiê (pseudonimização — garantir que nome/CPF/contato **nunca** aparecem na saída), chunking recursivo, montagem de query de busca web (garantir que só termos técnicos saem, nunca identificadores do aluno), parsing de citações `[KB-n]`/`[WEB-n]`.

### 1.2 Componentes — Vitest + React Testing Library

Só componentes **críticos com lógica real**, não cobertura ampla de UI:

- **`SessaoForm`** (registro de sessão) — o form mais usado do app e o de maior lógica: lista dinâmica de exercícios, autocomplete do catálogo, "Repetir última sessão", "salvar e registrar outra aluna". Entregável de teste da Fase 3.
- **`UploadDocumento`** — fluxo de upload em duas etapas (criar signed URL → confirmar), estados de progresso e erro.

Testar comportamento observável pelo usuário (o que aparece na tela, o que o submit envia), não detalhes internos. IA e rede sempre mockadas neste nível.

### 1.3 E2E — Playwright (Fase 8)

3–4 fluxos de smoke, com **IA sempre mockada** (sem custo, sem flakiness):

- login → dashboard;
- criar aluno → aparece na lista;
- registrar sessão → aparece na timeline;
- (opcional) gerar relatório com a IA mockada → renderiza as seções.

Rodam no CI no **merge para `main`**, contra um Preview Deployment apontando para o Supabase de staging (nunca produção). Não são gate de PR — o gate de PR é lint + typecheck + unit (seção 4).

---

## 2. Isolamento RLS — requisito desde a Fase 1

O pior cenário do produto é **vazamento cross-tenant** (dado de saúde de aluna de A visível para B). Por isso, testes automatizados de isolamento são **requisito desde a Fase 1** e crescem junto com o schema.

**Formato:** teste SQL rodado pelo Supabase CLI contra o banco local, com pelo menos **duas usuárias de tenants diferentes**. O padrão para cada tabela de domínio:

1. Cria duas usuárias (A e B), cada uma em seu tenant, e semeia dados de ambas com o service role.
2. Assume a identidade da usuária A (`set request.jwt.claims` / sessão autenticada de A) e afirma que:
   - A **enxerga** os próprios registros;
   - A **não enxerga nenhum** registro do tenant de B (`SELECT` retorna zero linhas);
   - A **não consegue** inserir/atualizar/apagar registros no tenant de B.
3. Repete simetricamente para B.

Cobertura por fase (cada migration que adiciona uma tabela de domínio adiciona seu teste de isolamento na mesma fase):

- **Fase 1:** `tenants`, `profiles`, `tenant_members` — a prova base de que A não lê o tenant de B.
- **Fase 2:** `students`, `audit_logs`.
- **Fase 3:** `assessments`, `student_conditions`, `sessions`, `session_exercises`, `body_measurements` (mais o caso especial de `exercises`: catálogo global visível a todas + itens do tenant visíveis só ao dono).
- **Fase 4:** `documents` + **Storage** (usuária B não acessa um objeto de A nem por signed URL/URL adivinhada; prefixo por `tenant_id`).
- **Fase 5:** `kb_documents`, `kb_chunks` — chunk `scope='tenant'` de A nunca aparece para B; `match_kb_chunks` respeita o escopo; escrita de chunks só via service role.
- **Fase 6/7:** `ai_reports`, `ai_usage_log`, `chat_conversations`, `chat_messages` (conversas privadas por usuária dentro do tenant).

Esses testes travam a regra R1 do roadmap e devem estar verdes antes de qualquer fase seguinte fechar.

---

## 3. Golden set de retrieval — regressão de qualidade

O RAG em pt-BR é um risco de produto (retrieval ruim → resposta ruim → perda de confiança do público leigo). A defesa é um **golden set** de regressão, introduzido na **Fase 5**.

- **~15 perguntas** representativas de fisioterapia/Pilates, cada uma com os `document_id`/páginas de chunks esperados (a "resposta certa" do retrieval).
- Roda `match_kb_chunks` para cada pergunta e verifica se os chunks esperados aparecem no top-k. **Meta: ≥ 80% de acerto.**
- É um teste de **qualidade/regressão**, não um gate binário de PR — uma queda no acerto sinaliza regressão de chunking, embeddings ou da função híbrida antes de chegar ao usuário.
- Plano B escalonado se o acerto cair de forma persistente (documentado como melhoria): `text-embedding-3-large` → embedding multilíngue dedicado → reranker (hook já previsto na camada de retrieval).

Roda também como smoke após mudanças no pipeline de ingestão ou na função `match_kb_chunks`.

---

## 4. Gates de CI

Definido em `.github/workflows/ci.yml` (ver 06-infra-deploy.md).

**Gate obrigatório em todo PR** (job `quality`, Node 22):

1. `npx biome ci .` — lint + formatação (Biome 2.x).
2. `npx tsc --noEmit` — typecheck (strict + `noUncheckedIndexedAccess`).
3. `npm run test -- --run` — Vitest (unit + validators + componentes RTL).

Um PR só entra com esses três verdes.

**No merge para `main`:**

- Job `db-staging` aplica as migrations no Supabase de staging (`supabase db push`).
- Suíte **Playwright** (a partir da Fase 8) contra o preview, com IA mockada.

Os testes SQL de isolamento RLS rodam localmente no fluxo de migration (`supabase db reset` recria e valida a sequência) e, junto do `db-staging`, contra staging — garantindo que uma migration nunca afrouxa uma policy sem ser percebida.

---

## 5. Supabase advisors a cada migration

`supabase db advisors` (via CLI/MCP) roda **a cada migration**, contra staging e produção, e não pode ter findings críticos. Cobre:

- tabelas com RLS desabilitada ou sem policies;
- funções `SECURITY DEFINER` sem `search_path` fixo;
- índices/constraints faltando, colunas expostas indevidamente.

Findings críticos bloqueiam a promoção da migration para produção. Este é o backstop automatizado do isolamento de tenant, complementando os testes SQL da seção 2.

---

## 6. Checklist de revisão de uso de `service_role`

O service role **bypassa a RLS** — é o único caminho por onde um vazamento cross-tenant pode passar despercebido. Consolidado como revisão formal na **Fase 8**, mas a regra vale desde o primeiro uso.

Onde o service role é legítimo no MVP: worker de ingestão da KB (`POST /api/jobs/ingest`, escrita de `kb_chunks`), scripts admin de ingestão da base global, e jobs de IA que precisem de acesso amplo. Onboarding **não** usa service role (o trigger de signup já cria tenant/profile/membership; o onboarding é um simples `UPDATE` sob RLS).

Revisão (grep por todo import de `src/lib/supabase/admin.ts` + inspeção manual de cada uso):

- [ ] Todo caminho que usa service role **filtra `tenant_id` explicitamente na query** — a RLS não está lá para proteger; o filtro manual é a única barreira.
- [ ] Nenhum `admin.ts` é importado fora de `src/server/**`.
- [ ] O worker de ingestão só grava chunks do documento/tenant da mensagem que ele mesmo verificou por assinatura QStash.
- [ ] Nenhum endpoint público expõe operação de service role sem verificação de identidade/assinatura.
- [ ] Nenhum dado de aluno de um tenant é lido por um caminho de outro tenant durante builds de dossiê de IA.

Item de critério de aceite da Fase 8, ao lado de "advisors sem findings críticos".

---

## 7. O que não testamos no MVP

Escolha deliberada de escopo (o custo não se justifica nesta fase): cobertura ampla de UI, testes de RSC isolados, visual regression, testes de carga. Reavaliar pós-MVP conforme o produto ganhar tração.
