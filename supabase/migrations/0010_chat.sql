-- 0010_chat — Fase 7
-- Chat assistente com RAG. Conversas privadas por usuária DENTRO do tenant.
-- Autoridade: 02-banco-de-dados.md (1.9, 2.3) + 04-ia.md.

create table public.chat_conversations (
  id         uuid primary key default gen_random_uuid(),
  tenant_id  uuid not null references public.tenants (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  student_id uuid references public.students (id) on delete set null,
  title      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index chat_conversations_idx on public.chat_conversations (tenant_id, user_id, updated_at desc);

create trigger set_updated_at
before update on public.chat_conversations
for each row execute function private.set_updated_at();

create table public.chat_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.chat_conversations (id) on delete cascade,
  tenant_id       uuid not null references public.tenants (id) on delete cascade,
  user_id         uuid not null references auth.users (id) on delete cascade,
  role            text not null check (role in ('user', 'assistant', 'system', 'tool')),
  parts           jsonb not null default '[]',   -- formato UIMessage do AI SDK
  citations       jsonb not null default '[]',   -- fontes RAG/web ([KB-n]/[WEB-n])
  usage           jsonb not null default '{}',
  created_at      timestamptz not null default now()
);
create index chat_messages_idx on public.chat_messages (tenant_id, conversation_id, created_at);

-- ============================================================================
-- RLS: privado por usuária dentro do tenant
-- ============================================================================
alter table public.chat_conversations enable row level security;

create policy "chat_conversations_select" on public.chat_conversations
for select to authenticated
using (tenant_id in (select private.user_tenant_ids()) and user_id = (select auth.uid()));
create policy "chat_conversations_insert" on public.chat_conversations
for insert to authenticated
with check (tenant_id in (select private.user_tenant_ids()) and user_id = (select auth.uid()));
create policy "chat_conversations_update" on public.chat_conversations
for update to authenticated
using (tenant_id in (select private.user_tenant_ids()) and user_id = (select auth.uid()))
with check (tenant_id in (select private.user_tenant_ids()) and user_id = (select auth.uid()));
create policy "chat_conversations_delete" on public.chat_conversations
for delete to authenticated
using (tenant_id in (select private.user_tenant_ids()) and user_id = (select auth.uid()));

alter table public.chat_messages enable row level security;

create policy "chat_messages_select" on public.chat_messages
for select to authenticated
using (tenant_id in (select private.user_tenant_ids()) and user_id = (select auth.uid()));
create policy "chat_messages_insert" on public.chat_messages
for insert to authenticated
with check (tenant_id in (select private.user_tenant_ids()) and user_id = (select auth.uid()));

grant select, insert, update, delete on public.chat_conversations to authenticated;
grant select, insert on public.chat_messages to authenticated;
grant all on public.chat_conversations to service_role;
grant all on public.chat_messages to service_role;
