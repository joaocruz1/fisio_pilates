import type { UIMessage } from "ai";
import { Assistente } from "@/components/chat/assistente";
import { parsePinned } from "@/lib/chat-pins";
import { getConversation, getConversationMessages, listConversations } from "@/server/chat";
import { listStudents } from "@/server/students";

export const metadata = { title: "Assistente" };

export default async function AssistentePage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const [conversations, students, mensagens, conversa] = await Promise.all([
    listConversations(),
    listStudents(),
    c ? getConversationMessages(c) : Promise.resolve([]),
    c ? getConversation(c) : Promise.resolve(null),
  ]);

  const initialMessages: UIMessage[] = mensagens.map((m) => ({
    id: m.id,
    role: m.role as UIMessage["role"],
    parts: (m.parts as UIMessage["parts"]) ?? [],
  }));

  const alunos = students.map((s) => ({ id: s.id, nome: s.full_name }));
  const initialPinned = parsePinned(conversa?.pinned_context);

  return (
    <Assistente
      conversations={conversations}
      initialMessages={initialMessages}
      conversationId={c}
      alunos={alunos}
      initialPinned={initialPinned}
    />
  );
}
