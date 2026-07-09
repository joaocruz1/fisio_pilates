import { convertToModelMessages, stepCountIs, streamText, type UIMessage } from "ai";
import { MODELS, openrouter } from "@/lib/ai/client";
import { ajudaAppSystemPrompt } from "@/lib/ai/prompts/ajuda-app";
import { requireTenant } from "@/server/auth";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Assistente de AJUDA do app (aba de Dúvidas). Sem RAG/tools/persistência e sem
 * consumir a cota de IA — só orienta a usar a plataforma. Modelo barato (Haiku).
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { messages: UIMessage[] };
  await requireTenant();

  const provider = openrouter();
  const modelMessages = await convertToModelMessages(body.messages ?? []);

  const result = streamText({
    model: provider.chat(MODELS.cheap()),
    system: ajudaAppSystemPrompt(),
    messages: modelMessages,
    stopWhen: stepCountIs(1),
  });

  result.consumeStream();
  return result.toUIMessageStreamResponse();
}
