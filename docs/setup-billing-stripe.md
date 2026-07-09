# Setup manual — Billing Stripe + Painel admin

Tudo que **não dá pra automatizar por código** e precisa ser feito uma vez (ou revisado) antes de subir `feat/billing-stripe-admin` em produção. Está em ordem de execução.

> Já existe um script de seed (`scripts/seed-admin.mjs`) e um para a Renata (`scripts/seed-user.mjs`) — não precisa rodar nenhum desses antes do passo 1, só depois que as env vars estiverem configuradas.

---

## 1. Stripe Dashboard — criar catálogo de Price IDs

Você precisa de **7 Price IDs** antes de preencher o `.env`. Faça isso no [Stripe Dashboard](https://dashboard.stripe.com/test/products) (use **modo test** enquanto não for produção).

### 1.1. Ativar conta Stripe BR

- Acesse [dashboard.stripe.com](https://dashboard.stripe.com) e complete o onboarding se ainda não fez.
- Em **Settings → Branding**, defina nome, logo e cor (a Renata pediu UI discreta, sem cara de "casino").
- Ative o método de pagamento **Pix** e **Boleto** em **Settings → Payment methods → Brazil**.

### 1.2. Criar 4 Produtos (um por plano)

Em **Products → Add product** para cada:

| Plano | Nome do produto | Tipo | Preço (BRL) | Recorrência | Observação |
|---|---|---|---|---|---|
| **Essencial** | FisioPilates Essencial | Service | R$ 49,90 | Mensal | — |
| **Profissional** | FisioPilates Profissional | Service | R$ 99,90 | Mensal | — |
| **Clínica** | FisioPilates Clínica | Service | R$ 199,90 | Mensal | — |
| **Pay-as-you-go** | FisioPilates Pay-as-you-go | Service | R$ 0,00 | Mensal | assinatura base zerada; o dinheiro vem dos 3 itens metered abaixo |

Em cada produto, anote o **Price ID** (começa com `price_`) — vai entrar nas env vars.

### 1.3. Criar 3 preços metered (só do PAYG)

Dentro do produto **Pay-as-you-go**, clique em **Add another price** e crie:

| Nome interno | Preço unitário | Metadata `kind` | Uso |
|---|---|---|---|
| `PAYG - Chat message` | R$ 0,10 | `chat` | cada mensagem do chat da IA |
| `PAYG - AI report` | R$ 3,00 | `report` | cada relatório de evolução gerado |
| `PAYG - Vision photo` | R$ 0,50 | `vision` | cada foto analisada por visão |

**Importante:** em **Price settings → Billing scheme** escolha **"Per unit"**, e em **Usage type** marque **"Metered usage"**. O **Aggregation method** fica em **"Sum"** (default).

> A metadata `kind` é o que o `registrarUso` em `src/lib/ai/usage.ts` usa para mapear a operação → `subscription_item_id`. Se faltar, nada é cobrado no PAYG. Confira na aba "Metadata" do Price depois de criar.

### 1.4. Habilitar Customer Portal

- **Settings → Billing → Customer portal** → **Activate**
- Em "Features" ative pelo menos: **Cancel subscriptions**, **Update payment methods**, **View invoices**.
- O app chama `stripe.billingPortal.Session.create` direto — não precisa customizar URL nem branding agora.

---

## 2. Configurar webhook no Stripe

Em **Developers → Webhooks → Add endpoint**:

- **Endpoint URL:** `https://app.fisio-pilates.com/api/stripe/webhook` (troque pelo domínio real)
- **API version:** deixe a Stripe escolher (vai casar com `apiVersion: "2025-02-24.acacia"` do client)
- **Description:** `FisioPilates production`
- **Events to send** (selecione estes 6):
  - `checkout.session.completed`
  - `customer.subscription.created`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `customer.subscription.trial_will_end`
  - `invoice.paid`
  - `invoice.payment_failed`

Depois de salvar, anote o **Signing secret** (campo `whsec_...` em "Webhook details"). É o `STRIPE_WEBHOOK_SECRET`.

> Se você for testar local com `stripe listen --forward-to localhost:3000/api/stripe/webhook`, o secret vem de `stripe listen` (`whsec_...` diferente do Dashboard). Mantenha os dois em mente: use o do Dashboard em prod, o do CLI em dev.

---

## 3. Variáveis de ambiente

Adicione no `.env.local` (dev) e nas env vars do provedor (Vercel/Fly/etc — prod):

```env
# --- Stripe (server) ---
STRIPE_SECRET_KEY=sk_test_...          # ou sk_live_... em prod
STRIPE_WEBHOOK_SECRET=whsec_...        # do passo 2

# --- Stripe (cliente) ---
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...

# --- Price IDs (do passo 1.2 e 1.3) ---
STRIPE_PRICE_ESSENCIAL=price_...
STRIPE_PRICE_PROFISSIONAL=price_...
STRIPE_PRICE_CLINICA=price_...
STRIPE_PRICE_PAYG_BASE=price_...        # assinatura base R$0 do PAYG
STRIPE_PRICE_PAYG_CHAT=price_...        # metered, kind=chat
STRIPE_PRICE_PAYG_REPORT=price_...      # metered, kind=report
STRIPE_PRICE_PAYG_VISION=price_...      # metered, kind=vision
```

Em prod, troque `sk_test_` por `sk_live_` e `pk_test_` por `pk_live_`. O resto dos IDs (preços) pode continuar os mesmos se você usou o mesmo catálogo.

> Validação: o `src/lib/env.ts` falha com erro legível se faltar `STRIPE_SECRET_KEY` ou `STRIPE_WEBHOOK_SECRET`. Os `STRIPE_PRICE_*` são opcionais (o sistema cai em modo "sem Stripe configurado" se faltarem), mas a tela `/configuracoes/assinatura` só renderiza checkout se todos os 7 estiverem presentes.

---

## 4. Aplicar migrations no Supabase

```bash
# dev local
supabase db push

# ou direto contra o projeto remoto (use o MCP do Supabase se preferir)
npx supabase db push --db-url "$SUPABASE_DB_URL"
```

As 3 migrations novas:

- `0018_billing_core.sql` — novos valores de `tenants.plan` (`payg`, `vitalicio`), novos valores de `tenants.status` (`past_due`), colunas `stripe_*` / `current_period_*` / `trial_ends_at` / `cancel_at_period_end` / `canceled_at`, e tabelas `subscriptions`, `invoices`, `usage_records`, `stripe_events`. Função `private.is_admin()` (SECURITY DEFINER).
- `0019_admin_users.sql` — tabela `admin_users` + RLS.
- `0020_billing_policies.sql` — RLS para as 4 tabelas novas do billing.

Depois de aplicar, **regere os tipos**:

```bash
npm run db:types
```

(O arquivo `src/lib/types/database.types.ts` já está commitado com as novas tabelas/colunas, mas rodar `db:types` no projeto remoto garante que bate 100%.)

### 4.1. Rodar os testes de RLS

```bash
supabase test db
```

Espera-se verde nos 2 arquivos novos:

- `supabase/tests/0018_billing_rls_test.sql` — isolamento por tenant em `subscriptions`/`invoices`/`usage_records`.
- `supabase/tests/0019_admin_users_rls_test.sql` — admin não consegue se auto-promover.

---

## 5. Criar o primeiro super_admin

```bash
ADMIN_EMAIL=voce@exemplo.com \
ADMIN_PASSWORD='uma-senha-forte-aqui' \
ADMIN_NOME='Seu Nome' \
ADMIN_ROLE=super_admin \
node --env-file=.env.local scripts/seed-admin.mjs
```

- O script cria o usuário no Supabase Auth, o perfil em `profiles`, e a linha em `admin_users`.
- Roles disponíveis: `super_admin` (acessa tudo, inclusive `/admin/admins`), `support` (tudo exceto admins), `finance` (assinaturas/faturas/uso IA).
- Faça login em `/login` com esse e-mail: o `login-form` detecta a flag em `admin_users` e redireciona para `/admin` em vez de `/dashboard`.

---

## 6. Confirmar que a Renata continua vitalícia

```bash
node --env-file=.env.local scripts/seed-user.mjs
```

O script já foi atualizado — ele seta `tenants.plan = 'vitalicio'` no tenant da Renata. Saída esperada no SQL:

```sql
select email, tenants.plan
from auth.users
join tenant_members on tenant_members.user_id = auth.users.id
join tenants on tenants.id = tenant_members.tenant_id
where auth.users.email = 'rhenata@gmail.com';
-- plan: vitalicio
```

> Defesa em profundidade: mesmo se um webhook chegar com `metadata.tenant_id` da Renata por engano, `vitalicioGuard` em `src/lib/billing/sync.ts` ignora. UI em `/configuracoes/assinatura` também não renderiza "Mudar plano" para `plan='vitalicio'`.

---

## 7. Smoke test local (antes de subir)

Com o `.env.local` preenchido:

```bash
npm run typecheck   # 0 erros
npm run lint        # 0 erros
npm run test        # 48/48
npm run build       # todas as rotas registradas
```

Em outro terminal, escute os webhooks localmente:

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
# copia o whsec_... que aparece e usa no .env.local em STRIPE_WEBHOOK_SECRET
```

Em terceiro terminal, suba o app:

```bash
npm run dev
```

### 7.1. Roteiro de teste E2E (Stripe test mode)

| # | Ação | Esperado |
|---|---|---|
| 1 | Login com `rhenata@gmail.com` | Redireciona para `/dashboard`. Em `/configuracoes/assinatura` aparece "Plano Vitalício (cortesia)", sem botão "Mudar plano". |
| 2 | Cadastro de conta nova (`teste1@example.com`) em `/signup` | Tenant criado com `plan='free'`. Tela `/configuracoes/assinatura` mostra comparativo + botão "Assinar Essencial". |
| 3 | Clica "Assinar Essencial" → preenche cartão test (`4242 4242 4242 4242`) | Redireciona para Stripe Checkout, depois para `/configuracoes/assinatura/sucesso`. Webhook `checkout.session.completed` chega; `tenants.plan = 'essencial'`, `tenants.status = 'active'`, `tenants.trial_ends_at = +14d`. |
| 4 | Conversa com o chat (cria ~5 mensagens) | `ai_usage_log` recebe linhas, `usage_records` recebe linhas metered **dentro** da cota (não vira cobrança). |
| 5 | Estoura cota de chat (cria 500+ mensagens) | A partir do limite do plano (500 no Essencial), cada msg gera `usage_records` no Stripe. No fim do ciclo, a fatura vem com o excedente. |
| 6 | Clica "Gerenciar assinatura" → cancela no portal Stripe | `tenants.cancel_at_period_end = true`, banner "termina em DD/MM" aparece. |
| 7 | Stripe Dashboard → **Invoices → marque uma fatura como "Mark as unpaid"** (simula inadimplência) | Webhook `invoice.payment_failed` → `tenants.status = 'past_due'`. UI mostra banner amarelo. Login continua funcionando. |
| 8 | Stripe Dashboard → **Subscriptions → Delete subscription** (simula exaustão de retries) | Webhook `customer.subscription.deleted` → `tenants.plan = 'free'`, `tenants.status = 'suspended'`. UI bloqueia criar alunos, mas dados preservados. |
| 9 | Login com `ADMIN_EMAIL` (do passo 5) | Redireciona para `/admin`. Dashboard mostra KPIs. `/admin/tenants` lista o tenant da Renata (vitalicio) e o do teste (suspended). |
| 10 | Como `super_admin`, abre `/admin/admins` e cria um admin `support` | Funciona. Logout + login com o novo admin → `/admin/admins` retorna 403. |
| 11 | Tenta excluir a conta `teste1@example.com` em `/configuracoes` | Server action chama `cancelarAssinatura` (já está canceled, no-op), depois executa o cascade delete. Sem cobrança residual no Stripe. |

Se algum passo falhar, **não abra o PR pra prod** — revise os logs do webhook em **Developers → Webhooks → Logs**.

---

## 8. Deploy em produção (Vercel/Fly)

1. Suba a branch `feat/billing-stripe-admin` (o PR já está aberto).
2. Aplique as migrations no projeto Supabase de prod (passo 4).
3. Configure as env vars de prod (passo 3) — atenção: `sk_live_`, `pk_live_`, `whsec_` do Dashboard de prod.
4. Configure o webhook no Dashboard de prod (passo 2) com a URL de prod.
5. Crie o super_admin de prod (passo 5).
6. **Não** rode o `seed-user.mjs` em prod — ele é só para a Renata, e a Renata já existe.
7. Faça o merge do PR e dispare o deploy.
8. Smoke test do passo 7.1 em prod (com cartão test se a conta Stripe de prod permitir, ou com o modo test separado).

---

## 9. O que **não** precisa fazer

- ❌ Criar `STRIPE_WEBHOOK_SECRET` via CLI do Stripe — ele vem do Dashboard (passo 2).
- ❌ Configurar Stripe Connect — não usamos (decisão B1).
- ❌ Instalar `@stripe/stripe-js` — não coletamos cartão no nosso domínio (decisão B19).
- ❌ Adicionar Stripe ao cliente (`src/components/...`) — o `redirect(url)` no server action basta.
- ❌ Rodar `supabase db reset` em prod — vai apagar dados. Use `supabase db push`.

---

## 10. Troubleshooting

| Sintoma | Causa provável | Solução |
|---|---|---|
| `/configuracoes/assinatura` mostra "Stripe não configurado" | Falta alguma env var `STRIPE_PRICE_*` | Compare as 7 vars com o passo 3. |
| Webhook retorna 400 "stripe-signature ausente" | Proxy/CDN removendo header | Vercel: nada a fazer. Cloudflare: **não** inspecionar `/api/stripe/webhook` (cria regra de skip). |
| Webhook retorna 200 mas nada muda no banco | `tenants.plan` ainda é o antigo | Cheque os logs em **Developers → Webhooks → Logs** e os logs do Next em runtime. Se for `vitalicio`, é o `vitalicioGuard` bloqueando (esperado). |
| Renata vendo botão "Mudar plano" | `plan` dela não é `vitalicio` | Rode o passo 6 de novo ou atualize direto: `update tenants set plan='vitalicio' where id = (select tenant_id from tenant_members where user_id = '...');` |
| Admin vê `/admin/admins` como 403 | Login não tem `super_admin` | Rode o passo 5 com `ADMIN_ROLE=super_admin`, ou promova o admin atual via SQL. |
| `tenants.status` não muda para `suspended` após 4 falhas | Stripe Smart Retries ainda tentando | Em **Settings → Subscriptions → Manage retention settings** você controla após quantas falhas o Stripe deleta a subscription. Default: 4 tentativas em 7 dias. |

---

## Referências

- Decisões B1–B20: corpo do PR #1 (ou `docs/plan/...` quando subir pra `main`)
- Stripe Customer Portal: <https://stripe.com/docs/billing/subscriptions/customer-portal>
- Stripe Metered Billing: <https://stripe.com/docs/billing/subscriptions/metered-billing>
- Webhooks: <https://stripe.com/docs/webhooks>
- `src/lib/billing/`: implementação
- `src/lib/env.ts`: validação das env vars
- `scripts/seed-admin.mjs` / `scripts/seed-user.mjs`: seed
