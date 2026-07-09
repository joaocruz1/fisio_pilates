-- ============================================================================
-- Preferências de modelo de IA por usuária
-- ============================================================================
-- Cada profissional escolhe o nível (economico | balanceado | alta_precisao)
-- para cada feature (chat | relatório | vision). O servidor resolve o slug
-- OpenRouter + aplica fallback automático quando a combinação é inválida
-- (ex.: DeepSeek + vision → cai para Sonnet 5).
--
-- 1 usuária = 1 linha. 1-user-1-tenant no MVP, mas separar de `tenants` agora
-- evita migração quando o modelo multi-user chegar.
-- ============================================================================

create type ai_nivel as enum ('economico', 'balanceado', 'alta_precisao');

create table public.user_ai_preferences (
  user_id      uuid primary key references public.profiles(id) on delete cascade,
  chat_model   ai_nivel not null default 'balanceado',
  report_model ai_nivel not null default 'alta_precisao',
  vision_model ai_nivel not null default 'alta_precisao',
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.user_ai_preferences enable row level security;

create policy "user_ai_preferences_select_own"
  on public.user_ai_preferences for select
  using (auth.uid() = user_id);

create policy "user_ai_preferences_insert_own"
  on public.user_ai_preferences for insert
  with check (auth.uid() = user_id);

create policy "user_ai_preferences_update_own"
  on public.user_ai_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create index user_ai_preferences_user_id_idx
  on public.user_ai_preferences (user_id);

create trigger trg_user_ai_preferences_updated_at
  before update on public.user_ai_preferences
  for each row execute function private.set_updated_at();
