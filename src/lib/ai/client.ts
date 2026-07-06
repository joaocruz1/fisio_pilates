import "server-only";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { env } from "@/lib/env";

/**
 * Provider OpenRouter (compatível com o Vercel AI SDK v6).
 * Modelos pinados via env (decisão C13). A implementação de relatórios/chat,
 * guardrails e controle de custo chega nas Fases 6–7 — ver docs/plan/04-ia.md.
 */
export function openrouter() {
  return createOpenRouter({
    apiKey: env().OPENROUTER_API_KEY,
    // Não permitir que os provedores usem os dados para treino.
    extraBody: { provider: { data_collection: "deny" } },
  });
}

export const MODELS = {
  main: () => env().OPENROUTER_MODEL,
  fallback: () => env().OPENROUTER_FALLBACK_MODEL,
  small: () => env().OPENROUTER_SMALL_MODEL,
} as const;
