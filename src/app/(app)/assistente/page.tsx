import type { UIMessage } from "ai";
import { Assistente } from "@/components/chat/assistente";
import { getConversationMessages, listConversations } from "@/server/chat";

export const metadata = { title: "Assistente" };

export default async function AssistentePage({
  searchParams,
}: {
  searchParams: Promise<{ c?: string }>;
}) {
  const { c } = await searchParams;
  const conversations = await listConversations();
  const mensagens = c ? await getConversationMessages(c) : [];

  const initialMessages: UIMessage[] = mensagens.map((m) => ({
    id: m.id,
    role: m.role as UIMessage["role"],
    parts: (m.parts as UIMessage["parts"]) ?? [],
  }));

  return (
    <Assistente
      conversations={conversations}
      initialMessages={initialMessages}
      conversationId={c}
    />
  );
}
