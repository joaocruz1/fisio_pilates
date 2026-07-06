import "server-only";
import { createClient } from "@/lib/supabase/server";

/** Preços por milhão de tokens (USD, preço cheio — C13). */
const PRECOS: Record<string, { in: number; out: number }> = {
  "anthropic/claude-sonnet-5": { in: 3, out: 15 },
  "anthropic/claude-sonnet-4.6": { in: 3, out: 15 },
  "anthropic/claude-haiku-4.5": { in: 1, out: 5 },
  "openai/text-embedding-3-small": { in: 0.02, out: 0 },
};

export function custoUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRECOS[model] ?? { in: 3, out: 15 };
  return (inputTokens / 1e6) * p.in + (outputTokens / 1e6) * p.out;
}

export class QuotaError extends Error {
  constructor() {
    super("Você atingiu o limite de uso de IA deste mês. Ele é renovado no início do próximo mês.");
    this.name = "QuotaError";
  }
}

function inicioDoMesISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

/** Gasto de IA vs. cota mensal do tenant. */
export async function getUsoMensal(tenantId: string): Promise<{ gasto: number; limite: number }> {
  const supabase = await createClient();
  const [{ data: tenant }, { data: usos }] = await Promise.all([
    supabase.from("tenants").select("ai_monthly_limit_usd").eq("id", tenantId).single(),
    supabase
      .from("ai_usage_log")
      .select("cost_usd")
      .eq("tenant_id", tenantId)
      .gte("created_at", inicioDoMesISO()),
  ]);
  const gasto = (usos ?? []).reduce((s, u) => s + (u.cost_usd ?? 0), 0);
  return { gasto, limite: tenant?.ai_monthly_limit_usd ?? 0 };
}

/** Barra a operação se a cota mensal foi atingida (402 amigável). */
export async function assertQuota(tenantId: string): Promise<void> {
  const { gasto, limite } = await getUsoMensal(tenantId);
  if (limite > 0 && gasto >= limite) throw new QuotaError();
}

type UsageLike = {
  inputTokens?: number;
  outputTokens?: number;
  promptTokens?: number;
  completionTokens?: number;
};

export async function logUsage(params: {
  tenantId: string;
  userId: string | null;
  kind: "report" | "chat" | "embedding" | "multi_query";
  model: string;
  usage: UsageLike;
  metadata?: Record<string, unknown>;
}): Promise<void> {
  const inputTokens = params.usage.inputTokens ?? params.usage.promptTokens ?? 0;
  const outputTokens = params.usage.outputTokens ?? params.usage.completionTokens ?? 0;
  const supabase = await createClient();
  await supabase.from("ai_usage_log").insert({
    tenant_id: params.tenantId,
    user_id: params.userId,
    kind: params.kind,
    model: params.model,
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    cost_usd: custoUsd(params.model, inputTokens, outputTokens),
    metadata: (params.metadata ?? {}) as never,
  });
}

/** Retry com backoff exponencial para erros transitórios do provedor. */
export async function withRetry<T>(fn: () => Promise<T>, tentativas = 3): Promise<T> {
  let ultimo: unknown;
  for (let i = 0; i < tentativas; i++) {
    try {
      return await fn();
    } catch (e) {
      ultimo = e;
      const status = (e as { statusCode?: number })?.statusCode;
      if (status && status !== 429 && status < 500) throw e; // erro não-transitório
      await new Promise((r) => setTimeout(r, 2 ** i * 800));
    }
  }
  throw ultimo;
}

/** Traduz erros do OpenRouter para mensagens pt-BR. */
export function mapAiError(err: unknown): Error {
  if (err instanceof QuotaError) return err;
  const status = (err as { statusCode?: number })?.statusCode;
  if (status === 429)
    return new Error("O serviço de IA está sobrecarregado. Tente novamente em instantes.");
  if (status === 402) return new Error("Sem créditos de IA no momento. Contate o suporte.");
  if (status === 503) return new Error("O serviço de IA está indisponível. Tente mais tarde.");
  return new Error("Não foi possível gerar a análise. Tente novamente.");
}
