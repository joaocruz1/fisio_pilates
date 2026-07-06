# 05 — Frontend, Estrutura Next.js e UX

Parte do planejamento do FisioPilates — ver `00-visao-geral.md`.

> Escopo: stack frontend, estrutura do projeto Next.js, auth flow com Supabase, mapa de telas do MVP, padrões de código (RSC, Server Actions, validators) e diretrizes de acessibilidade/mobile-first. Banco/RLS em `02-banco-de-dados.md`, RAG em `03-rag.md`, IA em `04-ia.md`, infra Vercel/CI em `06-infra-deploy.md`, testes em `09-testes-qualidade.md`.

---

## 1. Stack frontend (versões reais instaladas)

O projeto já foi scaffoldado. As versões abaixo são as do `package.json` atual — os docs devem sempre refletir o que está instalado, não "versões alvo".

| Tecnologia | Versão instalada | Papel / justificativa |
|---|---|---|
| **Next.js** | `16.2.10` (App Router, RSC, Turbopack no dev) | Padrão para Vercel serverless; RSC reduz JS no cliente (importante para público pouco técnico em celulares medianos); Server Actions eliminam a necessidade de uma camada de API própria para CRUD. |
| **React** | `19.2.4` | Requisito do Next 16; `useActionState`/`useOptimistic` úteis nos forms. |
| **TypeScript** | `5.x` (strict + `noUncheckedIndexedAccess`) | Tipos ponta a ponta, inclusive os gerados do banco (`lib/types/database.types.ts`). |
| **Tailwind CSS** | `4.x` (`@tailwindcss/postcss`) | Config CSS-first (`@theme` em `globals.css`), tokens da marca em CSS variables. |
| **shadcn/ui** | CLI `shadcn ^4.13`, estilo **`radix-lyra`**, `radix-ui ^1.6`, `tw-animate-css` | Componentes copiados para o repo (controle total, sem lock-in), acessíveis (Radix), fáceis de manter 100% em pt-BR. Base do design system. Config em `components.json`. |
| **Ícones** | `@phosphor-icons/react ^2.1` (iconLibrary do shadcn) + `lucide-react ^1.23` (também instalado) | O shadcn foi inicializado com `iconLibrary: "phosphor"` — componentes gerados pelo CLI importam Phosphor. **Regra: ícones novos seguem o padrão do componente shadcn em que estão inseridos**; não misturar as duas bibliotecas dentro de uma mesma tela/componente. |
| **react-hook-form** | `7.81` + `@hookform/resolvers ^5.4` | Forms não controlados e performáticos — fichas de avaliação/anamnese são longas, RHF evita re-render. |
| **zod** | `4.4` | Validação compartilhada client/server (seção 5) e validação de env no boot. |
| **TanStack Query** | `@tanstack/react-query 5.101` | **Uso pontual, não global**: polling do status de geração de relatório, uploads com progresso, listas com busca digitada (debounce). Dados de página vêm por RSC — não duplicar. |
| **Recharts** | `3.9` | Gráficos de evolução (dor, frequência, carga, medidas). Componentes `"use client"`. |
| **Vercel AI SDK** | `ai ^6.0.219` + `@openrouter/ai-sdk-provider ^2.10` | AI SDK **v6**: `useChat` + streaming SSE para o chat; `generateObject` para relatórios (server). Provider oficial do OpenRouter evita SSE manual. |
| **@supabase/supabase-js** | `2.110` + `@supabase/ssr 0.12` | Auth com cookies em RSC/middleware/actions (padrão oficial do App Router). Nunca usar o pacote deprecado `auth-helpers`. |
| **date-fns** | `4.4` + locale `ptBR` | Formatação de datas em pt-BR (sessões, histórico). |
| **sonner** | `2.x` | Toasts — feedback claro de salvar/erro, essencial para o público-alvo. |
| **unpdf** | `1.6` | Extração de texto de PDF no server (upload de documentos e ingestão de KB). |
| **server-only** | `0.0.1` | Marca módulos que jamais podem vazar para o bundle do client. |
| **Biome** | `2.5` (dev) | Lint + format numa ferramenta só — detalhes em `06-infra-deploy.md`. |
| **Vitest** | `4.1` + Testing Library (`@testing-library/react 16.3`, jsdom) (dev) | Estratégia de testes em `09-testes-qualidade.md`. |

**Modelo de IA (contrato com `04-ia.md`):** `anthropic/claude-sonnet-5` pinado via env `OPENROUTER_MODEL` (fallback `anthropic/claude-sonnet-4.6`; `anthropic/claude-haiku-4.5` para tarefas auxiliares). Nunca usar alias `latest` em produção. Embeddings via `POST /v1/embeddings` do próprio OpenRouter (`openai/text-embedding-3-small`, 1536d) — não há provedor separado de embeddings.

**Decisões de exclusão (MVP):** sem dark mode; sem framework de i18n — UI só em pt-BR, com strings centralizadas em `src/lib/textos.ts` (ver seção 5); sem Zustand/Redux (RSC + Query pontual + estado local bastam); sem Stripe/billing.

---

## 2. Estrutura de pastas

Árvore alvo do projeto (route groups `(auth)`/`(app)` só organizam layouts, não afetam URL; **URLs finais em pt-BR**: `/alunos`, `/assistente`, `/conhecimento`, `/configuracoes`):

```
fisio_pilates/
├── docs/
│   └── plan/                          # 00-visao-geral.md … 09-testes-qualidade.md
├── public/                            # logo, favicon, og-image
├── supabase/                          # config + migrations (ver 02-banco-de-dados.md)
│   └── migrations/
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # <html lang="pt-BR">, fontes, <Toaster/>
│   │   ├── globals.css                # Tailwind v4 @theme (tokens da marca)
│   │   ├── page.tsx                   # landing mínima → CTA login/cadastro
│   │   ├── not-found.tsx
│   │   ├── error.tsx
│   │   │
│   │   ├── (auth)/                    # layout centrado, sem sidebar
│   │   │   ├── layout.tsx
│   │   │   ├── login/page.tsx
│   │   │   ├── cadastro/page.tsx
│   │   │   ├── recuperar-senha/page.tsx
│   │   │   └── redefinir-senha/page.tsx
│   │   │
│   │   ├── auth/
│   │   │   ├── callback/route.ts      # exchangeCodeForSession (OAuth/PKCE — preparado p/ Google pós-MVP)
│   │   │   └── confirm/route.ts       # verifyOtp (links de e-mail)
│   │   │
│   │   ├── (app)/                     # área logada: sidebar + header + bottom nav
│   │   │   ├── layout.tsx             # requireTenant(); Providers (QueryClient)
│   │   │   ├── onboarding/page.tsx    # 1º login: COMPLETAR perfil/tenant (ver seção 3)
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── alunos/
│   │   │   │   ├── page.tsx           # lista + busca
│   │   │   │   ├── novo/page.tsx
│   │   │   │   └── [alunoId]/         # param = students.id
│   │   │   │       ├── layout.tsx     # cabeçalho do aluno + Tabs navegáveis por URL
│   │   │   │       ├── page.tsx       # aba Dados
│   │   │   │       ├── avaliacao/page.tsx
│   │   │   │       ├── sessoes/
│   │   │   │       │   ├── page.tsx
│   │   │   │       │   └── nova/page.tsx
│   │   │   │       ├── documentos/page.tsx
│   │   │   │       └── evolucao/page.tsx   # gráficos + relatórios IA
│   │   │   ├── assistente/page.tsx    # chat IA com RAG
│   │   │   ├── conhecimento/page.tsx  # base de conhecimento (uploads)
│   │   │   └── configuracoes/page.tsx
│   │   │
│   │   └── api/                       # Route Handlers (só o que exige HTTP puro)
│   │       ├── ai/
│   │       │   ├── chat/route.ts      # POST streaming (AI SDK v6) — maxDuration=120
│   │       │   └── analyses/
│   │       │       ├── route.ts       # POST gera relatório (generateObject) — maxDuration=300
│   │       │       └── [id]/route.ts  # GET status do relatório (polling da UI)
│   │       └── jobs/
│   │           └── ingest/route.ts    # worker QStash de ingestão de KB (assinatura verificada) — maxDuration=300
│   │
│   ├── components/
│   │   ├── ui/                        # shadcn (gerado pelo CLI; não editar à mão sem motivo)
│   │   ├── layout/                    # AppSidebar, AppHeader, MobileNav, Breadcrumbs
│   │   ├── alunos/                    # AlunoForm, AlunoCard, TabelaAlunos, FichaAvaliacaoForm
│   │   ├── sessoes/                   # SessaoForm, ListaExercicios, HistoricoSessoes
│   │   ├── documentos/                # UploadDocumento, GaleriaDocumentos, VisualizadorDoc
│   │   ├── evolucao/                  # GraficoEvolucao, RelatorioIA, BotaoGerarRelatorio
│   │   ├── chat/                      # ChatAssistente, MensagemChat, FontesCitadas
│   │   ├── conhecimento/              # UploadMaterial, ListaMateriais
│   │   └── shared/                    # EmptyState, ConfirmDialog, DataTable, PageHeader
│   │
│   ├── hooks/                         # use-debounce, use-upload, use-media-query
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # createBrowserClient
│   │   │   ├── server.ts              # createServerClient (cookies) — RSC/actions/handlers
│   │   │   ├── middleware.ts          # updateSession p/ middleware
│   │   │   └── admin.ts               # service role — SÓ importável em src/server/**
│   │   ├── validators/                # zod compartilhado client/server (seção 5)
│   │   │   ├── aluno.ts
│   │   │   ├── avaliacao.ts
│   │   │   ├── sessao.ts
│   │   │   ├── documento.ts
│   │   │   ├── chat.ts
│   │   │   └── onboarding.ts
│   │   ├── types/
│   │   │   ├── database.types.ts      # gerado: supabase gen types typescript (script db:types)
│   │   │   └── domain.ts              # tipos de domínio derivados
│   │   ├── utils.ts                   # cn(), formatadores pt-BR (data, telefone, CPF)
│   │   ├── textos.ts                  # TODAS as strings de UI (pt-BR) centralizadas
│   │   └── env.ts                     # validação zod das envs no boot
│   │
│   ├── server/                        # server-only: todo arquivo abre com import 'server-only'
│   │   ├── auth.ts                    # requireUser(), requireTenant() — React.cache
│   │   ├── actions/                   # Server Actions ("use server")
│   │   │   ├── onboarding.ts          # completa perfil/tenant (UPDATE — ver seção 3)
│   │   │   ├── alunos.ts
│   │   │   ├── avaliacoes.ts
│   │   │   ├── sessoes.ts
│   │   │   ├── documentos.ts          # criarUrlUpload + confirmarUpload
│   │   │   ├── relatorios.ts          # dispara geração / consulta relatórios
│   │   │   └── conhecimento.ts        # upload de material + enfileira ingestão (QStash)
│   │   └── services/                  # lógica de negócio pura (chamada por actions/handlers)
│   │       ├── ai/                    # client.ts, guardrails.ts, prompts/, schemas/ (ver 04-ia.md)
│   │       ├── rag/                   # ragSearch() híbrida + Tavily (ver 03-rag.md)
│   │       └── storage/               # paths por tenant e políticas de upload
│   │
│   └── middleware.ts
│
├── .env.example                       # TODAS as envs documentadas (lista em 06-infra-deploy.md)
├── components.json                    # shadcn: style radix-lyra, iconLibrary phosphor
├── next.config.ts
├── postcss.config.mjs
├── biome.json
├── vercel.json                        # regions: ["gru1"]
├── package.json
└── tsconfig.json
```

> Nota de nomenclatura: os docs `03-rag.md` e `04-ia.md` referem-se aos módulos de IA como `lib/ai/client.ts`, `lib/ai/rag.ts` etc. No app, esses módulos vivem em `src/server/services/ai/` e `src/server/services/rag/` — são código server-only (usam `OPENROUTER_API_KEY`) e por isso ficam sob `src/server/`, nunca sob `lib/` importável pelo client.

Regras estruturais:

- **`src/server/` nunca é importado por client components** — todo arquivo abre com `import 'server-only'`. `lib/supabase/admin.ts` idem.
- **`lib/validators/` é isomórfico** (sem dependência de server) — importável pelo RHF no client e pelas actions no server.
- **Abas da ficha do aluno são rotas** (não estado local): linkáveis, back button funciona, e cada aba faz seu próprio fetch RSC.
- **Schema em inglês, UI em pt-BR**: as rotas, componentes e strings usam a linguagem do domínio em português (`/alunos`, "aluna", "sessão"); tabelas e colunas do banco são em inglês (`students`, `sessions`, `assessments`). O mapeamento fica visível nos nomes: rota `/alunos/[alunoId]` consulta `students`; nunca criar tabela ou coluna em português. Glossário completo em `00-visao-geral.md`.

---

## 3. Auth flow com Supabase Auth (App Router)

### Os 4 clients (`@supabase/ssr`)

1. **Browser** (`lib/supabase/client.ts`): `createBrowserClient` — login/logout, upload direto ao Storage, realtime futuro.
2. **Server** (`lib/supabase/server.ts`): `createServerClient` lendo `cookies()` — RSC, Server Actions, Route Handlers. Criado **por request**, nunca em variável de módulo.
3. **Middleware** (`lib/supabase/middleware.ts`): `updateSession` — refresh do token e propagação dos cookies na resposta.
4. **Admin** (`lib/supabase/admin.ts`): service role, bypassa RLS — **apenas pipelines server-side** (worker de ingestão de KB, scripts admin de seed da base global). O onboarding **não** usa service role (ver abaixo). Todo uso de admin exige filtro manual de tenant e entra no checklist de revisão da Fase 8.

### `middleware.ts`

```ts
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp)$).*)'],
};
```

Lógica, nesta ordem:

1. `updateSession()` — sempre (mantém o token vivo).
2. Sem usuário e rota da área `(app)` → redirect `/login?redirect=<path>`.
3. Com usuário e rota da área `(auth)` → redirect `/dashboard`.
4. **Middleware é UX, não segurança**: a autorização real acontece via `supabase.auth.getUser()` no server + **RLS por tenant no banco** (ver `02-banco-de-dados.md`). O layout de `(app)` sempre revalida com `getUser()` — nunca confiar só no `getSession()` do cookie.

### Criação do tenant: trigger no signup + onboarding que só completa

**Toda usuária nasce com tenant.** Um trigger de banco no signup (`auth.users` insert) cria, numa única transação, as linhas mínimas de `profiles`, `tenants` e `tenant_members` (detalhes em `02-banco-de-dados.md`). Consequências para o frontend:

- O RLS funciona desde o primeiro request autenticado — nenhuma tela precisa tratar "usuária sem tenant".
- O **onboarding é um simples UPDATE**: a Server Action `completarOnboarding` (em `server/actions/onboarding.ts`) valida com zod e completa os dados que não existem no signup — nome completo, nome do estúdio/consultório (opcional), CREFITO (opcional), telefone — e marca `profiles.onboarding_completed_at`. Roda com o client de servidor normal (RLS), **sem service role no caminho**.

### `requireUser()` / `requireTenant()` (`src/server/auth.ts`)

- `requireUser()`: `getUser()`; sem usuário → `redirect('/login')`.
- `requireTenant()`: `requireUser()` → carrega `profiles` + membership em `tenant_members` (via RLS) → se `onboarding_completed_at` é nulo, `redirect('/onboarding')` → retorna `{ user, profile, tenantId }` para a árvore.
- Ambos embrulhados em `React.cache` — o layout `(app)` e as páginas chamam o mesmo helper sem repetir queries no mesmo request.

### Fluxos

- **Cadastro**: `/cadastro` (nome, e-mail, senha, **aceite LGPD** com link para a política) → `signUp` com `emailRedirectTo` (e nome em `options.data`, que o trigger usa para semear o `profiles` mínimo) → tela "confirme seu e-mail" → link abre `/auth/confirm` (`verifyOtp` type `signup`) → sessão criada → `requireTenant()` manda para `/onboarding` (perfil ainda incompleto).
- **Onboarding**: formulário único e curto (nome, estúdio, CREFITO, telefone) → action `completarOnboarding` → `redirect('/dashboard')`.
- **Login**: `signInWithPassword` no client → `router.push(redirect ?? '/dashboard')`. Google OAuth fica pós-MVP (o handler `/auth/callback/route.ts` com `exchangeCodeForSession` já fica pronto).
- **Recuperar senha**: `resetPasswordForEmail(email, { redirectTo: '/auth/confirm?next=/redefinir-senha' })` → `/redefinir-senha` chama `updateUser({ password })`.
- **Logout**: Server Action `signOut()` + `redirect('/login')`.

---

## 4. Mapa de telas do MVP (pt-BR)

Princípios de UX para o público (fisioterapeutas autônomas, pouco técnicas): **máximo 2 níveis de navegação**; sidebar com 5 itens + nome/avatar no rodapé; **linguagem de domínio** ("aluna", "sessão", "avaliação" — nunca "registro", "entidade"); botões primários grandes; toast de confirmação em toda mutação; **mobile-first** (uso na maca/estúdio com celular — seção 6).

**Navegação (sidebar):** Início · Alunos · Assistente · Base de Conhecimento · Configurações. Mobile: bottom nav com os mesmos itens.

| Tela | Rota | O que mostra | Ações principais |
|---|---|---|---|
| **Login / Cadastro / Recuperação** | `/login`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha` | Formulário simples, logo, mensagens de erro em português claro ("E-mail ou senha incorretos"); cadastro com aceite LGPD | Entrar, Criar conta, Esqueci minha senha |
| **Onboarding** | `/onboarding` | Boas-vindas + form que **completa** o perfil (nome, estúdio, CREFITO, telefone) — o tenant já existe (seção 3) | "Começar a usar" |
| **Início (Dashboard)** | `/dashboard` | Saudação ("Bom dia, Ana"); cards: alunos ativos, sessões na semana, últimas sessões registradas; lista "precisam de atenção" (15+ dias sem sessão); atalho grande "Registrar sessão" | Registrar sessão, Nova aluna, abrir ficha |
| **Lista de alunos** | `/alunos` | Busca por nome (client, debounce), cards no mobile / tabela no desktop: nome, telefone (link WhatsApp), última sessão, status ativo/inativo; empty state ilustrado no 1º uso | "Nova aluna", abrir ficha, filtrar ativos/inativos |
| **Nova aluna** | `/alunos/novo` | Form curto obrigatório (nome, nascimento, telefone) + seções opcionais colapsadas (endereço, contato de emergência, observações); aviso LGPD sobre dados de saúde; registro de consentimento (`consent_signed_at`/`consent_version`) | Salvar → redireciona à ficha sugerindo preencher a avaliação |
| **Ficha — Dados** | `/alunos/[alunoId]` | Cabeçalho fixo (nome, idade, telefone/WhatsApp, status) + abas **Dados · Avaliação · Sessões · Documentos · Evolução** (rotas). Aba Dados: cadastro editável | Editar, arquivar/reativar, excluir (ConfirmDialog com aviso LGPD; soft delete `deleted_at`) |
| **Ficha — Avaliação** | `/alunos/[alunoId]/avaliacao` | Ficha fisioterapêutica: anamnese (queixa principal, histórico médico, cirurgias, medicamentos, dor EVA 0–10), avaliação postural por segmento, testes, objetivos, contraindicações; condições/patologias (CRUD inline); **versionada** — reavaliação é nova linha (`kind='reassessment'`), histórico com datas | Nova avaliação, editar rascunho, gerenciar condições; comparar com anterior (pós-MVP) |
| **Ficha — Sessões** | `/alunos/[alunoId]/sessoes` | Linha do tempo (mais recente primeiro): data, duração, exercícios (nome, aparelho, molas/carga, séries/reps), dor pré/pós, observações | "Registrar sessão", ver detalhe, editar, **duplicar última** (ação mais usada do app) |
| **Registrar sessão** | `/alunos/[alunoId]/sessoes/nova` | Form otimizado para velocidade pós-aula: data (hoje default), duração, lista dinâmica de exercícios (autocomplete do catálogo + entrada livre), aparelho, série/rep/carga, dor, observações. Botão **"Repetir última sessão"** pré-preenche tudo | Salvar; **"Salvar e registrar outra aluna"** |
| **Ficha — Documentos** | `/alunos/[alunoId]/documentos` | Grade por categoria: Exames, Fotos posturais (comparação lado a lado por `taken_at`), Laudos, Termos, Outros; preview de imagem/PDF; download por signed URL curta | Enviar arquivo (upload direto ao Storage com progresso), baixar, excluir, categorizar |
| **Ficha — Evolução (IA)** | `/alunos/[alunoId]/evolucao` | Gráficos Recharts (dor ao longo das sessões, frequência mensal, progressão por exercício, medidas corporais) + lista de relatórios anteriores (data, tipo, status) + botão "Gerar análise com IA". A geração é **síncrona no server com estado de progresso e polling na UI** (sem streaming de tokens); o relatório nasce **rascunho** e a profissional **revisa e aprova** (humano no circuito). Relatório estruturado por seções + **banner fixo de disclaimer** ("apoio à decisão — não substitui julgamento clínico") | Gerar relatório, revisar/aprovar, ler, excluir; export PDF (pós-MVP) |
| **Assistente IA** | `/assistente` | Chat em tela cheia: streaming da resposta (`useChat`), histórico de conversas (drawer), sugestões iniciais ("Exercícios para hérnia lombar?"), **chips de fontes**: `[KB-n]` expande o trecho citado da base, `[WEB-n]` abre link externo com sinalização "(fonte: web)"; subtítulo permanente de disclaimer; título da conversa gerado automaticamente | Enviar pergunta, nova conversa, reabrir conversa antiga (hidratação do histórico), apagar conversa |
| **Base de conhecimento** | `/conhecimento` | Lista de materiais (nome, tipo, tamanho, status: **Processando** com progresso por páginas / **Pronto** / **Erro**) + área de upload (PDF); campo `license_note` e aviso "envie apenas materiais que você possui legalmente"; distinção visual entre base global (somente leitura) e materiais do tenant | Enviar material, acompanhar progresso, excluir (cascata remove os chunks) |
| **Configurações** | `/configuracoes` | Seções: Perfil (nome, CREFITO, telefone, estúdio), Conta (e-mail, alterar senha), **Uso de IA neste mês** (consumo vs limite do tenant), Privacidade/LGPD (exportar meus dados, excluir conta), Plano ("Gratuito" — placeholder para billing futuro) | Salvar perfil, alterar senha, logout, excluir conta (double-confirm) |

---

## 5. Padrões de código

### Server Components vs Client Components

- **Default: Server Component.** Páginas, listas, ficha do aluno, timeline de sessões, relatórios — fetch direto com o client Supabase de servidor (o RLS aplica o isolamento por tenant automaticamente).
- **Client Components** (folhas, com `"use client"`): forms RHF, chat (`useChat`), upload com progresso, gráficos Recharts, busca com debounce, dialogs/tabs interativos.
- Padrão de composição: página RSC busca dados → passa **props serializáveis** para o componente client de form/gráfico. Nunca passar o client Supabase entre fronteiras.

### Server Actions vs Route Handlers

| Use **Server Actions** | Use **Route Handlers** |
|---|---|
| Todas as mutações CRUD (aluno, avaliação, sessão, metadados de documento, perfil) | `POST /api/ai/chat` — streaming do assistente (AI SDK v6 exige Response stream); `maxDuration = 120` |
| Onboarding (completar perfil), logout | `POST /api/ai/analyses` — geração de relatório com `generateObject`; `maxDuration = 300`; `GET /api/ai/analyses/[id]` para o polling de status |
| Disparar ações simples de negócio (ex.: enfileirar ingestão) | `POST /api/jobs/ingest` — worker QStash de ingestão de KB (assinatura verificada) |
| Criar **signed upload URL** do Storage | Webhooks futuros (billing), crons futuros; qualquer endpoint consumido fora do app Next |

**Convenções de Server Action** (obrigatórias):

1. `import 'server-only'` + `"use server"`.
2. Primeiro passo sempre `requireTenant()`.
3. Validar input com zod (`schema.safeParse`) — nunca confiar no client.
4. Retorno padronizado **`{ ok: true, data } | { ok: false, erro: string }`**, consumido por `useActionState` (mensagem de `erro` já em pt-BR, vinda de `textos.ts`/do schema).
5. `revalidatePath()` do recurso afetado.
6. **`tenant_id` nunca vem do formulário** — sempre derivado da sessão (`requireTenant()`); o RLS é a segunda linha de defesa.

### Upload de arquivos (padrão único)

Nunca passar o arquivo pela função serverless (limite de 4,5 MB de body na Vercel). Fluxo em 2 actions:

1. `criarUrlUpload` — valida tipo/tamanho/tenant e gera signed upload URL do Supabase Storage (buckets `student-documents`, `kb-sources`, `avatars` — privados).
2. Browser faz `PUT` direto ao Storage com barra de progresso (`use-upload`).
3. `confirmarUpload` — grava o metadado no banco (e, para materiais de `/conhecimento`, enfileira a ingestão via QStash — contrato em `03-rag.md`).

Downloads sempre por signed URL curta (60–300 s), nunca URL pública.

### Validação zod compartilhada

- Schemas em `src/lib/validators/*`, um arquivo por agregado; tipos inferidos (`type NovoAlunoInput = z.infer<typeof novoAlunoSchema>`).
- **O mesmo schema roda no client** (resolver do RHF → erros inline em pt-BR) **e no server** (action → segurança). Mensagens de erro em português definidas no próprio schema.
- Variantes por operação: `alunoSchema` base, `criarAlunoSchema = alunoSchema.omit({ id: true })`, `atualizarAlunoSchema = alunoSchema.partial()…`.
- Os campos dos schemas seguem os nomes do banco em inglês (`full_name`, `birth_date`) — a tradução para a UI acontece nos labels/mensagens, não nos nomes de campo.
- `src/lib/env.ts`: schema zod das variáveis de ambiente validado no import — falha de build/boot com mensagem clara, em vez de erro silencioso em produção.

### TanStack Query — uso pontual

Um único `QueryClientProvider` no layout `(app)`, mas queries só onde RSC não resolve: polling do status de relatório (`/api/ai/analyses/[id]`), progresso de upload, busca digitada com debounce na lista de alunos. Regra: se a página consegue buscar por RSC, não criar query.

### `src/lib/textos.ts` — strings de UI centralizadas

Toda string visível ao usuário (labels, botões, toasts, empty states, mensagens de erro) vive em `textos.ts`, agrupada por tela/domínio. Benefícios: UI 100% pt-BR consistente sobre um schema em inglês, revisão de tom num lugar só, e porta aberta para i18n futura sem framework agora. Componentes não hard-codam frases; mensagens de erro de API/IA são mapeadas para pt-BR antes de chegar à tela.

### Ícones

O shadcn foi inicializado com `iconLibrary: "phosphor"` — os componentes gerados pelo CLI usam `@phosphor-icons/react`. Como `lucide-react` também está instalado, a regra é: **ícone novo segue o padrão do componente shadcn em que está inserido** (na prática, Phosphor como default), e nunca misturar as duas bibliotecas na mesma tela. Tamanhos e pesos consistentes via tokens do design system.

---

## 6. Acessibilidade e mobile-first (uso na maca com celular)

O cenário de uso número 1 é a fisioterapeuta registrando a sessão **no celular, entre uma aluna e outra, muitas vezes com uma mão só**. Isso orienta o design inteiro:

**Mobile-first estrutural**

- Layout responsivo do menor breakpoint para cima; bottom nav no mobile com os mesmos 5 itens da sidebar.
- Listas viram cards no mobile (ex.: `/alunos`), tabela só no desktop.
- Botões primários grandes; **alvos de toque ≥ 44px**; ações principais ao alcance do polegar (rodapé da tela em forms).
- Inputs com `font-size ≥ 16px` (evita zoom automático do iOS); teclados adequados (`inputmode="numeric"` em carga/dor, `type="tel"` em telefone).

**Velocidade no fluxo crítico (registrar sessão)**

- Data default = hoje; "Repetir última sessão" pré-preenche tudo; autocomplete de exercícios; "Salvar e registrar outra aluna" encadeia registros. Meta: < 2 min por sessão no celular.
- Toast de confirmação (sonner) em toda mutação — feedback inequívoco para público pouco técnico.
- RSC minimiza JS no cliente — importante em aparelhos medianos e rede de estúdio instável.

**Acessibilidade**

- Base Radix via shadcn/ui: foco gerenciado, navegação por teclado, `aria-*` corretos em dialogs, tabs, menus.
- `<html lang="pt-BR">`; labels explícitos em todos os campos (nunca placeholder como label); erros de validação associados ao campo (`aria-describedby`), inline e em português claro.
- Contraste AA nos tokens de cor do tema; estados de foco visíveis; ícones sempre acompanhados de texto nas ações principais (ícone sozinho só com `aria-label`).
- Empty states ilustrados com instrução do próximo passo ("Cadastre sua primeira aluna") — o app nunca mostra tela vazia sem orientação.
- Linguagem: sempre o vocabulário da profissional ("aluna", "avaliação", "sessão"); mensagens de erro dizem o que fazer, não o que falhou tecnicamente ("Não conseguimos salvar. Verifique sua conexão e tente de novo.").

---

## 7. Pontos de contato com os outros docs

1. **Banco/RLS (`02-banco-de-dados.md`)**: tabelas em inglês (`tenants`, `profiles`, `tenant_members`, `students`, `assessments`, `sessions`, `session_exercises`, `body_measurements`, `documents`, `kb_documents`/`kb_chunks`, `ai_reports`, `chat_conversations`/`chat_messages`, `audit_logs`); RLS via `private.user_tenant_ids()`; trigger de signup (seção 3); buckets `student-documents`, `kb-sources`, `avatars`.
2. **RAG (`03-rag.md`)**: `/conhecimento` usa o mesmo fluxo de upload por signed URL e dispara a ingestão via QStash (`/api/jobs/ingest`); status/progresso por páginas vem de `kb_documents`.
3. **IA (`04-ia.md`)**: `POST /api/ai/chat` com `useChat` (AI SDK v6) e tools; `POST /api/ai/analyses` com `generateObject` + polling; a UI espera fontes citadas (chips `[KB-n]`/`[WEB-n]`) e o relatório estruturado com disclaimer obrigatório; quota e painel de uso em `/configuracoes`.
4. **Infra (`06-infra-deploy.md`)**: Vercel Pro `gru1`, Fluid Compute, `maxDuration` por rota, envs e previews protegidos; Supabase `sa-east-1`.
5. **Qualidade (`09-testes-qualidade.md`)**: Vitest 4 nos validators e formatadores; RTL em `SessaoForm`/`UploadDocumento`; Playwright E2E com IA mockada; Biome 2.5 + `tsc --noEmit` no CI.
