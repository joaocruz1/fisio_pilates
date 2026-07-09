-- 0013_chat_pinned_context
-- Permite fixar contexto (aluno, plano de aula, relatório de evolução) a uma
-- conversa do assistente. A IA passa a responder já embasada nesses itens.
-- Formato: [{ "tipo": "aluno"|"plano"|"relatorio", "id": uuid, "rotulo": text }]
-- Aditivo — sem novas policies (herda o RLS de chat_conversations).

alter table public.chat_conversations
  add column if not exists pinned_context jsonb not null default '[]'::jsonb;
