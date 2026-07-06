import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";
import { requireTenant } from "@/server/auth";

export type Conversation = Database["public"]["Tables"]["chat_conversations"]["Row"];
export type ChatMessage = Database["public"]["Tables"]["chat_messages"]["Row"];

export const listConversations = cache(async (): Promise<Conversation[]> => {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_conversations")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(50);
  return data ?? [];
});

export const getConversationMessages = cache(
  async (conversationId: string): Promise<ChatMessage[]> => {
    await requireTenant();
    const supabase = await createClient();
    const { data } = await supabase
      .from("chat_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });
    return data ?? [];
  },
);
