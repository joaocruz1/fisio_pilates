import "server-only";
import { precosDoModelo } from "@/lib/ai/modelos";
import { type UsageKind as MetredKind, registrarUso } from "@/lib/billing/usage";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Custo de uma chamada (USD). Preços vivem em `src/lib/ai/modelos.ts` —
 * a tabela de lá inclui Sonnet 5/4.6, Haiku 4.5, DeepSeek V3, Gemini Flash
 * e o modelo de embeddings. Slugs desconhecidos caem no preço do
 * `MODELS.main()` com warning.
 */
export function custoUsd(model: string, inputTokens: number, outputTokens: number): number {
  const p = precosDoModelo(model);
  return (inputTokens / 1e6) * p.input + (outputTokens / 1e6) * p.output;
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
  kind: "report" | "chat" | "embedding" | "multi_query" | "vision";
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

  // B20: integra com o meter Stripe quando aplicável.
  await registrarUsoMedido(params.tenantId, params.kind);
}

async function registrarUsoMedido(
  tenantId: string,
  kind: "report" | "chat" | "embedding" | "multi_query" | "vision",
): Promise<void> {
  const metredKind: MetredKind | null =
    kind === "chat"
      ? "chat_message"
      : kind === "report"
        ? "ai_report"
        : kind === "vision"
          ? "vision_photo"
          : null;
  if (!metredKind) return;

  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("stripe_subscription_id, current_period_start, current_period_end")
    .eq("id", tenantId)
    .single();
  if (!tenant?.stripe_subscription_id) return;
  if (!tenant.current_period_start || !tenant.current_period_end) return;

  // Heurística: o subscription_item_id é fixo por assinatura; cacheamos no
  // payload da próxima fatura. Para evitar lookup no Stripe a cada log,
  // confiamos em `tenants.stripe_subscription_id` e no `subscriptions.items`.
  try {
    const { data: sub } = await admin
      .from("subscriptions")
      .select("metadata")
      .eq("stripe_subscription_id", tenant.stripe_subscription_id)
      .single();
    const itemId =
      (sub?.metadata as { items?: { chat?: string; report?: string; vision?: string } } | null)
        ?.items?.[
        metredKind === "chat_message" ? "chat" : metredKind === "ai_report" ? "report" : "vision"
      ] ?? null;
    if (!itemId) return; // sem item metered; plano não cobra overage
    await registrarUso({
      tenantId,
      subscriptionId: tenant.stripe_subscription_id,
      kind: metredKind,
      quantity: 1,
      stripeSubscriptionItemId: itemId,
      periodStart: new Date(tenant.current_period_start),
      periodEnd: new Date(tenant.current_period_end),
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[billing] registrarUso medido falhou:", err);
  }
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
  // Loga o erro cru para diagnóstico (a mensagem amigável esconde a causa real).
  console.error("[ai] erro do provedor:", err instanceof Error ? (err.stack ?? err.message) : err);
  const status = (err as { statusCode?: number })?.statusCode;
  if (status === 429)
    return new Error("O serviço de IA está sobrecarregado. Tente novamente em instantes.");
  if (status === 402) return new Error("Sem créditos de IA no momento. Contate o suporte.");
  if (status === 503) return new Error("O serviço de IA está indisponível. Tente mais tarde.");
  return new Error("Não foi possível gerar a análise. Tente novamente.");
}
