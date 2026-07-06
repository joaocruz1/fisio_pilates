-- 0005_sessions_exercises — Fase 3
-- Catálogo de exercícios (global + por tenant), sessões de Pilates e os
-- exercícios executados em cada sessão. Autoridade: 02-banco-de-dados.md (1.4, 2.3).

-- ============================================================================
-- exercises — tenant_id NULL = catálogo global; com tenant_id = custom da profissional
-- ============================================================================
create table public.exercises (
  id                uuid primary key default gen_random_uuid(),
  tenant_id         uuid references public.tenants (id) on delete cascade,   -- NULL = global
  name              text not null,
  apparatus         text not null default 'mat'
                    check (apparatus in ('mat', 'reformer', 'cadillac', 'chair', 'barrel', 'accessories', 'other')),
  category          text,
  difficulty        text check (difficulty in ('basic', 'intermediate', 'advanced')),
  description       text,
  muscle_groups     text[],
  contraindications text[],
  media_path        text,
  is_active         boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (tenant_id, name)
);
create index exercises_tenant_idx on public.exercises (tenant_id);

create trigger set_updated_at
before update on public.exercises
for each row execute function private.set_updated_at();

alter table public.exercises enable row level security;

-- Leitura: catálogo global (tenant_id IS NULL) + exercícios do próprio tenant.
create policy "exercises_select" on public.exercises
for select to authenticated
using (tenant_id is null or tenant_id in (select private.user_tenant_ids()));
-- Escrita: só no próprio tenant (linhas globais são imutáveis para usuárias).
create policy "exercises_insert" on public.exercises
for insert to authenticated
with check (tenant_id in (select private.user_tenant_ids()));
create policy "exercises_update" on public.exercises
for update to authenticated
using (tenant_id in (select private.user_tenant_ids()))
with check (tenant_id in (select private.user_tenant_ids()));
create policy "exercises_delete" on public.exercises
for delete to authenticated
using (tenant_id in (select private.user_tenant_ids()));

grant select, insert, update, delete on public.exercises to authenticated;
grant all on public.exercises to service_role;

-- ---------------------------------------------------------------------------
-- Seed do catálogo global (~87 exercícios). tenant_id NULL.
-- ---------------------------------------------------------------------------
insert into public.exercises (tenant_id, name, apparatus, category, difficulty) values
  (null, 'The Hundred', 'mat', 'Core', 'basic'),
  (null, 'Roll Up', 'mat', 'Fortalecimento', 'intermediate'),
  (null, 'Roll Over', 'mat', 'Mobilidade', 'advanced'),
  (null, 'Single Leg Circles', 'mat', 'Mobilidade', 'basic'),
  (null, 'Rolling Like a Ball', 'mat', 'Equilíbrio', 'basic'),
  (null, 'Single Leg Stretch', 'mat', 'Core', 'basic'),
  (null, 'Double Leg Stretch', 'mat', 'Core', 'intermediate'),
  (null, 'Scissors', 'mat', 'Core', 'intermediate'),
  (null, 'Lower Lift', 'mat', 'Fortalecimento', 'intermediate'),
  (null, 'Criss Cross', 'mat', 'Core', 'intermediate'),
  (null, 'Spine Stretch Forward', 'mat', 'Alongamento', 'basic'),
  (null, 'Open Leg Rocker', 'mat', 'Equilíbrio', 'advanced'),
  (null, 'Corkscrew', 'mat', 'Core', 'advanced'),
  (null, 'Saw', 'mat', 'Mobilidade', 'intermediate'),
  (null, 'Swan', 'mat', 'Mobilidade', 'intermediate'),
  (null, 'Single Leg Kick', 'mat', 'Fortalecimento', 'intermediate'),
  (null, 'Double Leg Kick', 'mat', 'Fortalecimento', 'intermediate'),
  (null, 'Neck Pull', 'mat', 'Fortalecimento', 'advanced'),
  (null, 'Shoulder Bridge', 'mat', 'Estabilização', 'intermediate'),
  (null, 'Spine Twist', 'mat', 'Mobilidade', 'intermediate'),
  (null, 'Jackknife', 'mat', 'Fortalecimento', 'advanced'),
  (null, 'Side Kick Series', 'mat', 'Fortalecimento', 'basic'),
  (null, 'Teaser', 'mat', 'Core', 'advanced'),
  (null, 'Hip Circles', 'mat', 'Mobilidade', 'advanced'),
  (null, 'Swimming', 'mat', 'Estabilização', 'intermediate'),
  (null, 'Leg Pull Front', 'mat', 'Fortalecimento', 'advanced'),
  (null, 'Leg Pull Back', 'mat', 'Fortalecimento', 'advanced'),
  (null, 'Kneeling Side Kick', 'mat', 'Equilíbrio', 'intermediate'),
  (null, 'Mermaid', 'mat', 'Alongamento', 'intermediate'),
  (null, 'Boomerang', 'mat', 'Core', 'advanced'),
  (null, 'Seal', 'mat', 'Equilíbrio', 'basic'),
  (null, 'Push Up', 'mat', 'Fortalecimento', 'intermediate'),
  (null, 'Pelvic Curl', 'mat', 'Estabilização', 'basic'),
  (null, 'Chest Lift', 'mat', 'Core', 'basic'),
  (null, 'Cat Stretch', 'mat', 'Mobilidade', 'basic'),
  (null, 'Lateral Breathing', 'mat', 'Respiração', 'basic'),
  (null, 'Bird Dog', 'mat', 'Estabilização', 'basic'),
  (null, 'Plank', 'mat', 'Estabilização', 'intermediate'),
  (null, 'Side Plank', 'mat', 'Estabilização', 'intermediate'),
  (null, 'Footwork', 'reformer', 'Fortalecimento', 'basic'),
  (null, 'The Hundred (Reformer)', 'reformer', 'Core', 'intermediate'),
  (null, 'Frog', 'reformer', 'Mobilidade', 'basic'),
  (null, 'Leg Circles (Reformer)', 'reformer', 'Mobilidade', 'basic'),
  (null, 'Stomach Massage', 'reformer', 'Core', 'intermediate'),
  (null, 'Short Spine Massage', 'reformer', 'Mobilidade', 'intermediate'),
  (null, 'Long Stretch', 'reformer', 'Estabilização', 'intermediate'),
  (null, 'Down Stretch', 'reformer', 'Alongamento', 'intermediate'),
  (null, 'Up Stretch', 'reformer', 'Fortalecimento', 'advanced'),
  (null, 'Elephant', 'reformer', 'Estabilização', 'basic'),
  (null, 'Pulling Straps', 'reformer', 'Fortalecimento', 'intermediate'),
  (null, 'Backstroke', 'reformer', 'Core', 'advanced'),
  (null, 'Teaser (Reformer)', 'reformer', 'Core', 'advanced'),
  (null, 'Short Box Round', 'reformer', 'Core', 'basic'),
  (null, 'Short Box Flat', 'reformer', 'Fortalecimento', 'intermediate'),
  (null, 'Short Box Twist', 'reformer', 'Mobilidade', 'intermediate'),
  (null, 'Knee Stretches', 'reformer', 'Core', 'intermediate'),
  (null, 'Running', 'reformer', 'Fortalecimento', 'basic'),
  (null, 'Pelvic Lift', 'reformer', 'Estabilização', 'basic'),
  (null, 'Feet in Straps', 'reformer', 'Mobilidade', 'basic'),
  (null, 'Long Spine', 'reformer', 'Fortalecimento', 'advanced'),
  (null, 'Tendon Stretch', 'reformer', 'Alongamento', 'advanced'),
  (null, 'Semicircle', 'reformer', 'Mobilidade', 'advanced'),
  (null, 'Roll Down (Push Through)', 'cadillac', 'Mobilidade', 'basic'),
  (null, 'Leg Springs Circles', 'cadillac', 'Fortalecimento', 'intermediate'),
  (null, 'Tower', 'cadillac', 'Alongamento', 'intermediate'),
  (null, 'Breathing (Cadillac)', 'cadillac', 'Respiração', 'basic'),
  (null, 'Push Through', 'cadillac', 'Mobilidade', 'intermediate'),
  (null, 'Hanging Pull Ups', 'cadillac', 'Fortalecimento', 'advanced'),
  (null, 'Arm Springs Series', 'cadillac', 'Fortalecimento', 'basic'),
  (null, 'Footwork (Chair)', 'chair', 'Fortalecimento', 'basic'),
  (null, 'Pull Up (Chair)', 'chair', 'Fortalecimento', 'advanced'),
  (null, 'Step Down', 'chair', 'Equilíbrio', 'intermediate'),
  (null, 'Swan (Chair)', 'chair', 'Mobilidade', 'intermediate'),
  (null, 'Teaser (Chair)', 'chair', 'Core', 'advanced'),
  (null, 'Mountain Climb', 'chair', 'Equilíbrio', 'intermediate'),
  (null, 'Washer Woman', 'chair', 'Fortalecimento', 'intermediate'),
  (null, 'Ballet Stretches', 'barrel', 'Alongamento', 'basic'),
  (null, 'Swan (Barrel)', 'barrel', 'Mobilidade', 'intermediate'),
  (null, 'Short Box Series (Barrel)', 'barrel', 'Core', 'intermediate'),
  (null, 'Backbend (Barrel)', 'barrel', 'Mobilidade', 'advanced'),
  (null, 'Side Sit-Ups', 'barrel', 'Fortalecimento', 'intermediate'),
  (null, 'Magic Circle Arm Series', 'accessories', 'Fortalecimento', 'basic'),
  (null, 'Magic Circle Inner Thigh', 'accessories', 'Fortalecimento', 'basic'),
  (null, 'Foam Roller Balance', 'accessories', 'Equilíbrio', 'intermediate'),
  (null, 'Foam Roller Spine Release', 'accessories', 'Mobilidade', 'basic'),
  (null, 'Resistance Band Rows', 'accessories', 'Fortalecimento', 'basic'),
  (null, 'Small Ball Bridge', 'accessories', 'Estabilização', 'basic');

-- ============================================================================
-- sessions
-- ============================================================================
create table public.sessions (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references public.tenants (id) on delete cascade,
  student_id      uuid not null references public.students (id) on delete cascade,
  session_date    date not null default current_date,
  start_time      time,
  duration_min    smallint,
  status          text not null default 'completed'
                  check (status in ('scheduled', 'completed', 'no_show', 'cancelled')),
  pain_level_pre  smallint check (pain_level_pre between 0 and 10),
  pain_level_post smallint check (pain_level_post between 0 and 10),
  focus           text,
  notes           text,
  created_by      uuid not null references auth.users (id),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  deleted_at      timestamptz
);
create index sessions_student_idx on public.sessions (tenant_id, student_id, session_date desc);

create trigger set_updated_at
before update on public.sessions
for each row execute function private.set_updated_at();

alter table public.sessions enable row level security;

create policy "sessions_select" on public.sessions
for select to authenticated
using (tenant_id in (select private.user_tenant_ids()));
create policy "sessions_insert" on public.sessions
for insert to authenticated
with check (tenant_id in (select private.user_tenant_ids()));
create policy "sessions_update" on public.sessions
for update to authenticated
using (tenant_id in (select private.user_tenant_ids()))
with check (tenant_id in (select private.user_tenant_ids()));
create policy "sessions_delete" on public.sessions
for delete to authenticated
using (tenant_id in (select private.user_tenant_ids()));

grant select, insert, update, delete on public.sessions to authenticated;
grant all on public.sessions to service_role;

-- ============================================================================
-- session_exercises (base da análise de progresso)
-- ============================================================================
create table public.session_exercises (
  id               uuid primary key default gen_random_uuid(),
  tenant_id        uuid not null references public.tenants (id) on delete cascade,
  session_id       uuid not null references public.sessions (id) on delete cascade,
  exercise_id      uuid not null references public.exercises (id),
  order_index      smallint not null default 0,
  sets             smallint,
  reps             smallint,
  load_springs     text,                    -- molas do Pilates: "2 vermelhas + 1 azul"
  load_kg          numeric(5, 2),
  resistance_level smallint,                -- escala 1-5 normalizada (gráfico)
  difficulty_felt  smallint check (difficulty_felt between 1 and 5),
  quality_rating   smallint check (quality_rating between 1 and 5),
  notes            text,
  created_at       timestamptz not null default now()
);
create index session_exercises_session_idx on public.session_exercises (tenant_id, session_id);
create index session_exercises_exercise_idx on public.session_exercises (tenant_id, exercise_id);

alter table public.session_exercises enable row level security;

create policy "session_exercises_select" on public.session_exercises
for select to authenticated
using (tenant_id in (select private.user_tenant_ids()));
create policy "session_exercises_insert" on public.session_exercises
for insert to authenticated
with check (tenant_id in (select private.user_tenant_ids()));
create policy "session_exercises_update" on public.session_exercises
for update to authenticated
using (tenant_id in (select private.user_tenant_ids()))
with check (tenant_id in (select private.user_tenant_ids()));
create policy "session_exercises_delete" on public.session_exercises
for delete to authenticated
using (tenant_id in (select private.user_tenant_ids()));

grant select, insert, update, delete on public.session_exercises to authenticated;
grant all on public.session_exercises to service_role;
