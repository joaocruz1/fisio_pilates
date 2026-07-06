import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { NextResponse } from "next/server";
import { MODELS, openrouter } from "@/lib/ai/client";
import { chatSystemPrompt } from "@/lib/ai/prompts/chat-assistente";
import { buildChatTools, type Citacao } from "@/lib/ai/tools";
import { assertQuota, logUsage, QuotaError } from "@/lib/ai/usage";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/server/auth";

export const runtime = "nodejs";
export const maxDuration = 120;

function textoDe(msg: UIMessage): string {
  return (msg.parts ?? [])
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join(" ")
    .trim();
}

export async function POST(req: Request) {
  const { messages, conversationId, studentId } = (await req.json()) as {
    messages: UIMessage[];
    conversationId?: string;
    studentId?: string;
  };

  const ctx = await requireTenant();
  const supabase = await createClient();

  try {
    await assertQuota(ctx.tenant.id);
  } catch (e) {
    if (e instanceof QuotaError) return NextResponse.json({ erro: e.message }, { status: 402 });
    throw e;
  }

  // Resolve ou cria a conversa.
  let convId = conversationId;
  if (!convId) {
    const primeiro = textoDe(messages[messages.length - 1] ?? ({} as UIMessage));
    const { data: conv } = await supabase
      .from("chat_conversations")
      .insert({
        tenant_id: ctx.tenant.id,
        user_id: ctx.user.id,
        student_id: studentId ?? null,
        title: primeiro.slice(0, 60) || "Nova conversa",
      })
      .select("id")
      .single();
    convId = conv?.id;
  }

  // Persiste a mensagem do usuário (última do array).
  const ultima = messages[messages.length - 1];
  if (convId && ultima?.role === "user") {
    await supabase.from("chat_messages").insert({
      conversation_id: convId,
      tenant_id: ctx.tenant.id,
      user_id: ctx.user.id,
      role: "user",
      parts: ultima.parts as never,
    });
  }

  const citations: Citacao[] = [];
  const provider = openrouter();
  const modelMessages = await convertToModelMessages(messages);

  const result = streamText({
    model: provider.chat(MODELS.main()),
    system: chatSystemPrompt(),
    messages: modelMessages,
    tools: buildChatTools({ tenantId: ctx.tenant.id, citations }),
    stopWhen: stepCountIs(5),
    onFinish: async ({ text, usage }) => {
      if (convId) {
        await supabase.from("chat_messages").insert({
          conversation_id: convId,
          tenant_id: ctx.tenant.id,
          user_id: ctx.user.id,
          role: "assistant",
          parts: [{ type: "text", text }] as never,
          citations: citations as never,
          usage: usage as never,
        });
      }
      await logUsage({
        tenantId: ctx.tenant.id,
        userId: ctx.user.id,
        kind: "chat",
        model: MODELS.main(),
        usage,
        metadata: { conversationId: convId },
      });
    },
  });

  // Garante onFinish (gravação de uso) mesmo se o cliente desconectar.
  result.consumeStream();
  return result.toUIMessageStreamResponse({
    headers: convId ? { "x-conversation-id": convId } : undefined,
  });
}
