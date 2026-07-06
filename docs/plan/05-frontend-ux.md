# Frontend, Estrutura Next.js e UX

Parte do planejamento do FisioPilates — ver 00-visao-geral.md

Este documento cobre a camada de apresentação e a organização do código: stack com versões reais instaladas, estrutura de pastas, fluxo de autenticação com Supabase, mapa de telas do MVP em pt-BR e os padrões de código (RSC vs client, Server Actions, validators zod, TanStack Query pontual, acessibilidade/mobile-first). Banco/RLS, IA e RAG são referenciados só nos pontos de contato — o detalhe vive em `02-banco-de-dados.md`, `03-rag.md` e `04-ia.md`.

Princípio transversal: **o schema do banco é em inglês** (`tenants`, `students`, `sessions`, `assessments`, `documents`, `kb_documents`…), mas **a UI é 100% pt-BR**. As URLs, os textos de tela e os nomes de componentes ficam em pt-BR; toda string visível ao usuário sai de `src/lib/textos.ts`, nunca hard-coded em componente. Isso isola o idioma da UI da nomenclatura do banco e mantém uma única fonte de verdade para copy.

---

## 1. Stack frontend (versões reais instaladas)

O projeto já foi scaffoldado. As versões abaixo são as que estão em `package.json` — use-as como referência, não as invente.

| Tecnologia | Versão instalada | Papel |
|---|---|---|
| **Next.js** | `16.2.10` (App Router, RSC, Turbopack no dev) | Framework. RSC reduz JS no cliente (importante para público pouco técnico em celulares medianos); Server Actions eliminam a necessidade de uma camada de API própria para mutações. |
| **React** | `19.2.4` | `useActionState`/`useOptimistic` nos forms; `React.cache` para memoizar `requireTenant()` por request. |
| **TypeScript** | `^5` (`strict: true`, `noUncheckedIndexedAccess: true`) | Tipos ponta a ponta, incluindo os tipos gerados do banco (`database.types.ts`). |
| **Tailwind CSS** | `4.x` (config CSS-first via `@theme` em `globals.css`) | Sem `tailwind.config.js`; tokens da marca ficam no `globals.css`. `@tailwindcss/postcss` + `tw-animate-css`. |
| **shadcn/ui** | CLI `shadcn@^4.13`, estilo **`radix-lyra`**, `iconLibrary: phosphor` | Design system copiado para o repo (`src/components/ui/`). Base color `neutral`, CSS variables. Ver nota de ícones abaixo. |
| **radix-ui** | `^1.6.1` (pacote unificado) | Primitivos acessíveis por baixo do shadcn. |
| **react-hook-form** | `^7.81` + `@hookform/resolvers` `^5.4` | Forms não controlados — as fichas de avaliação/anamnese são longas e o RHF evita re-render. |
| **zod** | `^4.4` | Validação compartilhada client/server (seção 5). |
| **TanStack Query** | `^5.101` | **Uso pontual, não global** (seção 5). Dados de página vêm por RSC. |
| **Recharts** | `^3.9` | Gráficos de evolução (dor, frequência, carga, medidas). Componentes `"use client"`. |
| **Vercel AI SDK (`ai`)** | `^6.0` + `@openrouter/ai-sdk-provider` `^2.10` | `useChat` + streaming SSE para o chat; `generateObject` para relatórios (não streaming — ver `04-ia.md`). |
| **@supabase/supabase-js** | `^2.110` | Cliente do banco/Storage/Auth. |
| **@supabase/ssr** | `^0.12` | Auth com cookies em RSC/proxy/actions (padrão oficial App Router). Nunca usar o pacote deprecado `auth-helpers`. |
| **@phosphor-icons/react** | `^2.1` | Biblioteca de ícones padrão do estilo `radix-lyra`. |
| **lucide-react** | `^1.23` | Também instalado (alguns componentes shadcn o usam). Ver nota de ícones. |
| **date-fns** | `^4.4` + locale `ptBR` | Datas em pt-BR (sessões, histórico). |
| **sonner** | `^2.0` | Toasts — feedback de salvar/erro, essencial para o público-alvo. |
| **unpdf** | `^1.6` | Extração de texto de PDF no upload de documentos (runtime nodejs, ver `02-banco-de-dados.md`/`03-rag.md`). |
| **Biome** | `@biomejs/biome` `^2.5` | Lint + format numa ferramenta só (seção 7). Sem ESLint/Prettier. |
| **Vitest** | `^4.1` + Testing Library | Unit e componentes (seção 7). |

**Nota sobre ícones (importante):** o shadcn foi inicializado com `iconLibrary: phosphor` (`@phosphor-icons/react`), então componentes novos gerados pelo CLI usam Phosphor. Porém `lucide-react` também está instalado, porque alguns componentes shadcn já no repo importam de `lucide-react`. Regra prática: **ao adicionar um ícone, siga a biblioteca que o componente shadcn ao redor já usa** — não misture Phosphor e Lucide no mesmo componente. Em telas novas escritas do zero, prefira Phosphor (o padrão do estilo `radix-lyra`).

**Modelo IA (fatos fixos, detalhados em `04-ia.md`):** LLM `anthropic/claude-sonnet-5` pinado via env `OPENROUTER_MODEL` (fallback `anthropic/claude-sonnet-4.6`; auxiliar barato `anthropic/claude-haiku-4.5`). Embeddings `openai/text-embedding-3-small` (1536d) via `POST /v1/embeddings` do OpenRouter. Nunca usar alias `latest` em produção.

**Decisões de exclusão no MVP:** sem dark mode; sem framework de i18n (só pt-BR, strings centralizadas em `src/lib/textos.ts`); sem Zustand/Redux (RSC + Query + estado local bastam); sem Stripe/billing.

---

## 2. Estrutura de pastas

Árvore real do projeto scaffoldado (adaptada às decisões consolidadas). Observação de nomenclatura Next 16: o antigo `middleware.ts` foi **renomeado para `proxy`** — o arquivo raiz é `src/proxy.ts` exportando `proxy()`, e o helper de sessão fica em `src/lib/supabase/proxy.ts`. Funcionalmente é o mesmo mecanismo de middleware (roda no edge, mexe em cookies).

```
fisio_pilates/
├── docs/
│   └── plan/                          # esta documentação de projeto (00–09)
├── public/                            # logo, favicon, og-image
├── supabase/
│   └── migrations/                    # migrations (área banco — ver 02-banco-de-dados.md)
├── src/
│   ├── proxy.ts                       # Next 16: "middleware" → proxy; chama updateSession
│   │
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
│   │   │   ├── callback/route.ts      # exchangeCodeForSession (OAuth/PKCE — pronto p/ fase futura)
│   │   │   └── confirm/route.ts       # verifyOtp (links de e-mail: signup, recovery)
│   │   │
│   │   ├── (app)/                     # área logada: sidebar + header + bottom nav
│   │   │   ├── layout.tsx             # requireTenant(); Providers (TanStack Query)
│   │   │   ├── onboarding/page.tsx    # 1º login: completa dados do perfil/estúdio
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── alunos/
│   │   │   │   ├── page.tsx           # lista + busca
│   │   │   │   ├── novo/page.tsx
│   │   │   │   └── [alunoId]/
│   │   │   │       ├── layout.tsx     # cabeçalho fixo do aluno + Tabs (navegáveis por URL)
│   │   │   │       ├── page.tsx       # aba Dados
│   │   │   │       ├── avaliacao/page.tsx
│   │   │   │       ├── sessoes/
│   │   │   │       │   ├── page.tsx
│   │   │   │       │   └── nova/page.tsx
│   │   │   │       ├── documentos/page.tsx
│   │   │   │       └── evolucao/page.tsx   # relatórios IA + gráficos
│   │   │   ├── assistente/page.tsx    # chat IA com RAG
│   │   │   ├── conhecimento/page.tsx  # base de conhecimento (uploads)
│   │   │   └── configuracoes/page.tsx
│   │   │
│   │   └── api/                       # Route Handlers (só o que precisa de HTTP puro / streaming / duração longa)
│   │       ├── ai/
│   │       │   ├── chat/route.ts      # POST streaming (useChat) — maxDuration=120
│   │       │   └── analyses/route.ts  # POST geração de relatório (generateObject) — maxDuration=300
│   │       └── jobs/
│   │           └── ingest/route.ts    # worker de ingestão de KB (QStash, assinatura verificada) — maxDuration=300
│   │
│   ├── components/
│   │   ├── ui/                        # shadcn radix-lyra (gerado; não editar à mão sem motivo)
│   │   ├── layout/                    # AppSidebar, AppHeader, MobileNav, Breadcrumbs
│   │   ├── alunos/                    # AlunoForm, AlunoCard, TabelaAlunos, FichaAvaliacaoForm
│   │   ├── sessoes/                   # SessaoForm, ListaExercicios, HistoricoSessoes
│   │   ├── documentos/                # UploadDocumento, GaleriaDocumentos, VisualizadorDoc
│   │   ├── evolucao/                  # GraficoEvolucao, RelatorioIA, BotaoGerarRelatorio
│   │   ├── chat/                      # ChatAssistente, MensagemChat, FontesCitadas
│   │   ├── conhecimento/              # UploadMaterial, ListaMateriais
│   │   └── shared/                    # EmptyState, ConfirmDialog, DataTable, PageHeader
│   │
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts              # createBrowserClient
│   │   │   ├── server.ts              # createServerClient (cookies) — RSC/actions/handlers
│   │   │   ├── proxy.ts               # updateSession (usado por src/proxy.ts)
│   │   │   └── admin.ts               # service role — SÓ import em src/server/**
│   │   ├── validators/                # zod compartilhado, isomórfico (seção 5)
│   │   │   ├── index.ts
│   │   │   ├── aluno.ts
│   │   │   ├── avaliacao.ts
│   │   │   ├── sessao.ts
│   │   │   ├── documento.ts
│   │   │   ├── chat.ts
│   │   │   └── onboarding.ts
│   │   ├── types/
│   │   │   ├── database.types.ts      # gerado: npm run db:types
│   │   │   └── domain.ts              # tipos de domínio derivados
│   │   ├── ai/
│   │   │   └── client.ts              # OpenRouter + AI SDK v6 (contrato com área IA — ver 04-ia.md)
│   │   ├── utils.ts                   # cn(), formatadores pt-BR (data, telefone, CPF)
│   │   ├── textos.ts                  # TODAS as strings de UI centralizadas
│   │   └── env.ts                     # validação zod das envs no boot
│   │
│   └── server/                        # "server-only" (import 'server-only' no topo de tudo)
│       ├── auth.ts                    # requireUser(), requireTenant()
│       ├── actions/                   # Server Actions ("use server")
│       │   ├── onboarding.ts
│       │   ├── alunos.ts
│       │   ├── avaliacoes.ts
│       │   ├── sessoes.ts
│       │   ├── documentos.ts          # criarUrlUpload + confirmarUpload
│       │   ├── relatorios.ts          # dispara geração IA
│       │   └── conhecimento.ts
│       └── services/                  # lógica de negócio pura (chamada por actions/handlers)
│           ├── ai/                    # prompts, guardrails, builder de dossiê (contrato área IA)
│           ├── rag/                   # ragSearch, Tavily (contrato área IA)
│           └── storage/               # paths e políticas de upload
│
├── .env.example                       # TODAS as envs documentadas
├── next.config.ts
├── biome.json
├── vercel.json                        # { "regions": ["gru1"] }
├── package.json
└── tsconfig.json
```

Regras estruturais:

- **`src/server/` nunca é importado por client components.** Todo arquivo em `src/server/**` abre com `import 'server-only'`. `lib/supabase/admin.ts` (service role) idem — só pode ser importado de dentro de `src/server/**`.
- **`lib/validators/` é isomórfico** — sem dependência de server. É importável tanto pelo RHF no client quanto pelas actions no server. É o que permite validar com o mesmo schema nos dois lados.
- **Route groups `(auth)`/`(app)` só organizam layouts, não afetam a URL.** URLs finais em pt-BR: `/login`, `/alunos`, `/assistente`, `/conhecimento`, `/configuracoes`.
- **As abas da ficha do aluno são rotas, não estado local.** `/alunos/[alunoId]`, `/alunos/[alunoId]/avaliacao`, `.../sessoes`, `.../documentos`, `.../evolucao` — cada uma é linkável, o botão voltar funciona e cada aba faz seu próprio fetch RSC. O `layout.tsx` do `[alunoId]` renderiza o cabeçalho fixo do aluno + as Tabs.

---

## 3. Fluxo de autenticação com Supabase (App Router)

### Os quatro clients (`@supabase/ssr`)

1. **Browser** (`lib/supabase/client.ts`): `createBrowserClient` — login/logout no client, `PUT` direto ao Storage, realtime futuro.
2. **Server** (`lib/supabase/server.ts`): `createServerClient` lendo `cookies()` — usado em RSC, Server Actions e Route Handlers. **Criado por request**, nunca guardado em variável de módulo.
3. **Proxy** (`lib/supabase/proxy.ts`): `updateSession` — faz o refresh do token e propaga os cookies na resposta. Chamado por `src/proxy.ts`.
4. **Admin** (`lib/supabase/admin.ts`): service role, **bypassa RLS**. Uso restrito e revisado: jobs de ingestão de KB e scripts admin. Só importável de `src/server/**`. Com a decisão de tenancy (abaixo), o onboarding **não** precisa de service role.

### `src/proxy.ts` (o antigo middleware)

Matcher já configurado no scaffold:

```
matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)']
```

Lógica:

1. `updateSession()` sempre — mantém o token vivo e sincroniza cookies.
2. Sem usuário em rota `(app)` → redirect `/login?redirect=<path>`.
3. Com usuário em rota `(auth)` → redirect `/dashboard`.
4. **O proxy é UX, não segurança.** A autorização real é `supabase.auth.getUser()` no server (validado contra o Auth, não só o cookie) **+ RLS por tenant no banco**. O layout de `(app)` sempre revalida com `getUser()` — nunca confiar apenas em `getSession()`.

### Tenancy: trigger no signup, onboarding só completa dados

Decisão consolidada (prevalece sobre qualquer descrição divergente): **um trigger no banco cria o tenant no momento do signup**, e o onboarding é apenas um UPDATE dos dados que faltam. Concretamente:

- No signup, um trigger `on auth.users` cria, numa única transação, os registros mínimos: `profiles` (perfil da usuária), `tenants` (o "estúdio") e `tenant_members` (o vínculo). Toda usuária **nasce com um tenant**, então a RLS já funciona no primeiro request logado — não existe janela em que a sessão exista sem tenant.
- O `/onboarding` **não cria** nada. Ele apenas completa os campos que não existem no signup: nome completo, CREFITO (opcional), telefone, nome do estúdio (opcional). A Server Action `completarOnboarding` faz um `UPDATE` em `profiles`/`tenants` e grava `onboarding_completed_at`. **Sem service role no caminho** — é um UPDATE comum sob RLS.
- `requireTenant()` (`src/server/auth.ts`): `getUser()` → resolve o tenant da usuária via `tenant_members`; se `onboarding_completed_at` for nulo, `redirect('/onboarding')`; caso contrário retorna `{ user, tenant, profile }` para a árvore. Memoizado por request com `React.cache` para não repetir a query em cada página/aba.

Detalhes do trigger, das tabelas e das policies estão em `02-banco-de-dados.md`.

### Fluxos de auth

- **Cadastro** — `/cadastro` (nome, e-mail, senha, aceite LGPD com link para a política) → `signUp` com `emailRedirectTo` apontando para `/auth/confirm` → tela "confirme seu e-mail" → o link abre `/auth/confirm` (`verifyOtp`, type `signup`) → sessão criada, trigger já criou o tenant → proxy manda para `/onboarding`.
- **Onboarding** — form único e curto. Server Action `completarOnboarding`: valida com zod (`lib/validators/onboarding.ts`) → `UPDATE` do perfil/estúdio → marca `onboarding_completed_at` → `redirect('/dashboard')`.
- **Login** — `signInWithPassword` no client → `router.push(redirect ?? '/dashboard')`. Google OAuth fica para depois do MVP (o `/auth/callback/route.ts` com `exchangeCodeForSession` já está pronto).
- **Recuperar senha** — `resetPasswordForEmail(email, { redirectTo: '/auth/confirm?next=/redefinir-senha' })` → em `/redefinir-senha`, `updateUser({ password })`.
- **Logout** — Server Action `signOut()` + `redirect('/login')`.

---

## 4. Mapa de telas do MVP (pt-BR)

Princípios de UX para o público (fisioterapeutas pouco técnicas, muitas vezes usando o celular ao lado da maca): no máximo 2 níveis de navegação; sidebar com 5 itens; linguagem de domínio ("aluna", "sessão", "avaliação" — nunca "registro", "entidade"); botões primários grandes; toasts de confirmação sempre; mobile-first.

**Navegação:** sidebar no desktop e **bottom nav no mobile**, com os mesmos 5 itens — **Início · Alunos · Assistente · Base de Conhecimento · Configurações**.

| Tela | Rota | O que mostra | Ações principais |
|---|---|---|---|
| **Login / Cadastro / Recuperação** | `/login`, `/cadastro`, `/recuperar-senha`, `/redefinir-senha` | Form simples, logo, mensagens de erro em português claro ("E-mail ou senha incorretos"). Cadastro tem aceite LGPD com link para a política | Entrar, Criar conta, Esqueci minha senha |
| **Onboarding** | `/onboarding` | Boas-vindas + form curto (nome completo, nome do estúdio, CREFITO, telefone). O tenant já existe; aqui só completa dados | "Começar a usar" |
| **Início (Dashboard)** | `/dashboard` | Saudação ("Bom dia, Ana"); cards: alunos ativos, sessões na semana, últimas sessões registradas; bloco "precisam de atenção" (alunas 15+ dias sem sessão); atalho grande "Registrar sessão". Empty states no 1º uso | Registrar sessão, Novo aluno, abrir aluno |
| **Lista de alunos** | `/alunos` | Busca por nome (client, com debounce); cards no mobile / tabela no desktop: nome, telefone (link WhatsApp), última sessão, status ativo/inativo; filtro ativos/inativos; empty state ilustrado no 1º uso | "Nova aluna", abrir ficha, filtrar |
| **Novo aluno** | `/alunos/novo` | Form curto obrigatório (nome, nascimento, telefone) + seções opcionais colapsadas (endereço, contato de emergência, observações); aviso LGPD sobre dados de saúde; registro de consentimento | Salvar → redireciona à ficha sugerindo preencher a avaliação |
| **Ficha — Dados** | `/alunos/[alunoId]` | Cabeçalho fixo (nome, idade, telefone/WhatsApp, status) + abas **Dados · Avaliação · Sessões · Documentos · Evolução**. Aba Dados: cadastro editável | Editar, arquivar/reativar, excluir (ConfirmDialog + aviso LGPD de exclusão) |
| **Ficha — Avaliação** | `/alunos/[alunoId]/avaliacao` | Ficha fisioterapêutica: anamnese (queixa, histórico, cirurgias, medicamentos, dor 0–10/EVA), avaliação postural por segmento, objetivos, contraindicações; condições/patologias (CRUD inline). Versionada — histórico de avaliações anteriores com data; reavaliação = nova linha | Nova avaliação, editar rascunho, ver histórico |
| **Ficha — Sessões** | `/alunos/[alunoId]/sessoes` | Linha do tempo (mais recente primeiro): data, duração, exercícios (nome, aparelho, séries/molas/carga), observações, dor pré/pós | "Registrar sessão", ver detalhe, editar, **duplicar última** |
| **Registrar sessão** | `/alunos/[alunoId]/sessoes/nova` | Form otimizado pós-aula: data (hoje default), duração, lista dinâmica de exercícios (autocomplete de catálogo + entrada livre), aparelho, série/rep/carga, escala de dor, observações. Botão **"Repetir última sessão"** pré-preenche. Ação mais usada do app | Salvar; "salvar e registrar outra aluna" |
| **Ficha — Documentos** | `/alunos/[alunoId]/documentos` | Grade por categoria: Exames, Fotos posturais (comparação lado a lado por data), Laudos, Termos, Outros. Preview de imagem/PDF | Enviar arquivo (upload direto ao Storage via signed URL, com progresso), baixar (signed URL curta), excluir, categorizar |
| **Ficha — Evolução (IA)** | `/alunos/[alunoId]/evolucao` | Gráficos Recharts (dor ao longo das sessões, frequência mensal, progressão de carga por exercício, medidas corporais) + lista de relatórios anteriores + botão "Gerar análise com IA". A geração mostra **estado de progresso/polling** (não streaming de tokens — ver `04-ia.md`). Relatório nasce **rascunho** → a profissional revisa e aprova; banner fixo de disclaimer ("apoio à decisão — não substitui julgamento clínico") | Gerar relatório, ler, aprovar, excluir |
| **Assistente IA** | `/assistente` | Chat em tela cheia: histórico de conversas (drawer), streaming de resposta, chips de fontes citadas — `[KB-n]` (expandem o trecho da base) e `[WEB-n]` (link externo) — sugestões iniciais ("Exercícios para hérnia lombar?"), subtítulo permanente de disclaimer | Enviar pergunta, nova conversa, apagar conversa |
| **Base de conhecimento** | `/conhecimento` | Lista de materiais enviados (nome, tipo, tamanho, status: Processando com progresso por páginas / Pronto / Erro) + área de upload (PDF no MVP; DOCX depois — ver `03-rag.md`). Aviso legal: "envie apenas materiais que você possui legalmente" | Enviar material, ver status, excluir (remove os chunks em cascata) |
| **Configurações** | `/configuracoes` | Seções: Perfil (nome, CREFITO, telefone, estúdio); Conta (e-mail, alterar senha, logout); **Uso de IA neste mês** (consumo vs. cota); Privacidade/LGPD (exportar dados; excluir conta); Plano ("Gratuito" — placeholder para billing futuro) | Salvar perfil, alterar senha, exportar dados, excluir conta (double-confirm) |

---

## 5. Padrões de código

### Server Components vs Client Components

- **Default: Server Component.** Páginas, listas, ficha do aluno, timeline de sessões, relatórios lidos — fetch direto com o client Supabase de servidor (a RLS aplica o isolamento por tenant automaticamente).
- **Client Components** (folhas, com `"use client"`): forms RHF, chat (`useChat`), upload com progresso, gráficos Recharts, busca com debounce, dialogs/tabs interativos.
- **Padrão de composição:** a página RSC busca os dados → passa props serializáveis para o componente client de form/gráfico. **Nunca passar o client Supabase entre a fronteira server/client.**

### Server Actions vs Route Handlers

| Use **Server Actions** | Use **Route Handlers** (`src/app/api/**`) |
|---|---|
| Todas as mutações CRUD (aluno, avaliação, sessão, medidas, metadados de documento, perfil) | `POST /api/ai/chat` — streaming do assistente (`useChat` exige um Response stream), `maxDuration=120` |
| Onboarding, logout | `POST /api/ai/analyses` — geração de relatório (`generateObject`, síncrono, `maxDuration=300`), com polling de status na UI |
| Disparar geração de relatório e outras ações de negócio | `POST /api/jobs/ingest` — worker de ingestão de KB chamado pelo QStash (assinatura verificada), `maxDuration=300` |
| Criar **signed upload URL** do Storage e confirmar o metadado | Webhooks/crons futuros; qualquer endpoint consumido fora do app Next |

**Convenções de Server Action** (obrigatórias):

1. `import 'server-only'` no módulo + `"use server"` na action.
2. Primeiro passo sempre `requireTenant()`.
3. Validar o input com zod (`schema.safeParse`) — **nunca** confiar no client.
4. **Retorno padronizado** `{ ok: true, data } | { ok: false, erro: string }`, consumido no client por `useActionState`. As mensagens de erro saem em pt-BR (de `textos.ts` ou do próprio schema).
5. `revalidatePath()` do recurso afetado após a mutação.
6. O **`tenant_id` nunca vem do formulário** — é sempre derivado da sessão via `requireTenant()`.

**Upload de arquivos** (documentos e materiais de KB): nunca passar o arquivo pela função serverless (limite de 4,5 MB de body na Vercel). Fluxo em duas actions:

1. `criarUrlUpload` — valida tipo/tamanho/tenant e gera uma **signed upload URL** do Supabase Storage.
2. o browser faz `PUT` direto ao Storage, com barra de progresso.
3. `confirmarUpload` — grava o metadado no banco (e, para KB, enfileira a ingestão no QStash; ver `03-rag.md`).

### Validação zod compartilhada

- Schemas em `src/lib/validators/*`, um arquivo por agregado; tipos inferidos (`type NovoAlunoInput = z.infer<typeof novoAlunoSchema>`).
- **O mesmo schema roda no client** (resolver do RHF → erros inline em pt-BR) **e no server** (action → segurança). É a razão de `lib/validators/` ser isomórfico e sem imports de server.
- Variantes por operação a partir de um base: `alunoSchema` → `criarAlunoSchema = alunoSchema.omit({ id: true })`, `atualizarAlunoSchema = alunoSchema.partial()`.
- Estruturas clínicas grandes (anamnese, avaliação postural, testes) são validadas como objetos JSONB com schemas Zod **versionados** — ver `02-banco-de-dados.md`.
- `src/lib/env.ts`: schema zod de todas as variáveis de ambiente, validado no import. Falha de build/boot com mensagem clara, em vez de erro silencioso em produção.

### TanStack Query (uso pontual, não global)

Dados de página vêm por RSC e **não** devem ser reduplicados no Query. Reserve o TanStack Query para os poucos casos genuinamente client-side com estado assíncrono próprio:

- histórico e estado do chat IA;
- **polling do status** de geração de relatório (`/api/ai/analyses`);
- uploads com progresso;
- listas com busca digitada (debounce) que refazem fetch conforme o texto muda.

---

## 6. Acessibilidade e mobile-first

O contexto de uso dominante é **a profissional em pé, ao lado da maca, com o celular na mão, registrando a sessão que acabou de dar**. O design se otimiza para isso:

- **Mobile-first de verdade.** Layouts começam pela largura de celular; a versão desktop é o enriquecimento. Lista de alunos vira cards no mobile e tabela no desktop; a navegação vira bottom nav no mobile.
- **Alvos de toque grandes.** Botões primários amplos, campos com boa altura, área de toque ≥ 44px. Os botões "Registrar sessão" e "Repetir última sessão" são deliberadamente grandes — são as ações de maior frequência.
- **Fluxo de sessão em poucos toques.** O form de sessão pré-preenche data (hoje) e oferece "Repetir última sessão"; o alvo é registrar uma sessão em menos de dois minutos no celular.
- **Acessibilidade herdada do shadcn/Radix.** Os primitivos `radix-lyra` já entregam foco visível, navegação por teclado, roles ARIA e labels em dialogs/tabs/selects. Ao escrever componentes próprios, mantenha `label` associado a cada input, `aria-label` em botões só-ícone e não dependa apenas de cor para transmitir estado (status ativo/inativo, escala de dor).
- **Feedback sempre explícito.** Toda mutação dá toast (sonner) de sucesso ou erro em pt-BR — o público-alvo precisa de confirmação clara de que "salvou".
- **Erros em português claro**, nunca códigos crus. Erros de IA (429/503/402/cota) e de upload são mapeados para mensagens compreensíveis (ver `04-ia.md`).
- **Sem dark mode no MVP** — uma decisão de simplicidade, reavaliável depois.

---

## 7. Qualidade (frontend)

- **Lint/format: Biome 2.x** (`biome.json`). Uma ferramenta só, sem ESLint/Prettier. Scripts: `npm run lint` (`biome check .`), `npm run format` (`biome check --write .`). `next lint` está deprecado no Next 16, então não há perda em sair do ESLint.
- **TypeScript:** `strict: true`, `noUncheckedIndexedAccess: true`. Os tipos do banco (`src/lib/types/database.types.ts`) são gerados por `npm run db:types` e versionados no repo — atualize junto com cada migration.
- **Testes (Vitest 4 + Testing Library):**
  - *Unit* — todos os `lib/validators/*`, os formatadores pt-BR de `lib/utils.ts` e os helpers puros de `server/services`.
  - *Componentes* — apenas os críticos com lógica de verdade: `SessaoForm` (lista dinâmica de exercícios) e `UploadDocumento`.
  - *E2E (Playwright, no CI)* — 3–4 fluxos smoke: login → dashboard; criar aluno → aparece na lista; registrar sessão → aparece na timeline. IA mockada nos E2E (sem custo nem flakiness).
- **Fora do escopo do MVP:** cobertura ampla de UI, testes de RSC isolados, visual regression.

Estratégia de testes detalhada e gates de CI em `09-testes-qualidade.md`.

---

## Pontos de contato com as outras áreas

- **Banco/dados (`02-banco-de-dados.md`):** schema em inglês (`tenants`, `students`, `assessments`, `sessions`, `body_measurements`, `documents`, `kb_documents`/`kb_chunks`, `ai_reports`, `chat_conversations`/`chat_messages`), RLS por tenant via `private.user_tenant_ids()`, trigger de signup que cria o tenant, buckets `student-documents`/`kb-sources`/`avatars` privados com signed URLs.
- **IA (`04-ia.md`):** `POST /api/ai/chat` usa AI SDK v6 (`useChat`, tool-calling); `POST /api/ai/analyses` gera o relatório com `generateObject` + Zod (síncrono, com polling na UI); a UI espera as fontes citadas para renderizar os chips `[KB-n]`/`[WEB-n]`; modelo e embeddings via OpenRouter, pinados por env.
- **RAG (`03-rag.md`):** upload de material dispara a ingestão via QStash (`/api/jobs/ingest`); a UI de `/conhecimento` mostra o progresso por páginas; `ragSearch` alimenta as tools do chat e o dossiê do relatório.
- **Infra (`06-infra-deploy.md`):** Vercel Pro região `gru1`, Supabase `sa-east-1`, previews com Deployment Protection nunca contra o banco de produção, envs por ambiente.
