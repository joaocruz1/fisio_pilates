-- 0017_onboarding_tour — Estado do tour guiado (onboarding interativo)
-- Independente de onboarding_completed_at (formulário de dados): resetar o tour
-- não reabre o formulário. NULL = tour ainda não visto (usuária nova).

alter table public.profiles
  add column if not exists tour_completed_at timestamptz;
