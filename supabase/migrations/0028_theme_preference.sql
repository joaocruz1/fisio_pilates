-- 0028_theme_preference — Preferência de tema por conta (sincroniza entre dispositivos).
--
-- Espelha o padrão de tour_completed_at (0017): coluna simples em public.profiles.
-- NULL = a usuária nunca escolheu → o app trata como 'system' (segue o SO).
--
-- text + check em vez de enum: é o padrão já usado em user_ai_preferences.chat_model,
-- e evolui sem exigir `alter type ... add value` fora de transação.
--
-- RLS: profiles_select e profiles_update (0002_tenancy.sql) usam `id = auth.uid()`
-- e já cobrem esta coluna. Nenhuma policy nova é necessária.

alter table public.profiles
  add column if not exists theme text
    check (theme is null or theme in ('light', 'dark', 'system'));

comment on column public.profiles.theme is
  'Preferência de tema: light | dark | system. NULL = nunca escolheu (trata-se como system).';
