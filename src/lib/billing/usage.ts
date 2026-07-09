import "server-only";
import type Stripe from "stripe";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Registro de uso metered (B5, B6, B20).
 *
 * Fluxo:
 *  1) Insere linha em `usage_records` (recorded_to_stripe=false).
 *  2) Envia para o Stripe via `subscriptionItems.createUsageRecord`.
 *  3) Marca `recorded_to_stripe=true` e grava `stripe_usage_record_id`.
 *
 * Se Stripe falhar, a linha local fica pendente; um job diário reconcilia.
 * `idempotencyKey` evita cobrança duplicada em retries.
 */

export type UsageKind = "chat_message" | "ai_report" | "vision_photo";

type RegistrarUsoParams = {
  tenantId: string;
  subscriptionId: string | null; // null para tenants sem assinatura (free/vitalicio)
  kind: UsageKind;
  quantity?: number;
  stripeSubscriptionItemId: string | null;
  periodStart: Date;
  periodEnd: Date;
};

const KIND_TO_SUBSCRIPTION_ITEM: Record<UsageKind, "chat" | "report" | "vision"> = {
  chat_message: "chat",
  ai_report: "report",
  vision_photo: "vision",
};

export async function registrarUso(p: RegistrarUsoParams): Promise<void> {
  if (!p.subscriptionId || !p.stripeSubscriptionItemId) {
    // Sem assinatura paga: não faz metered (free/vitalicio não pagam).
    return;
  }
  const admin = createAdminClient();

  // 1) Linha local.
  const { data: row, error } = await admin
    .from("usage_records")
    .insert({
      tenant_id: p.tenantId,
      subscription_id: p.subscriptionId,
      kind: p.kind,
      quantity: p.quantity ?? 1,
      stripe_subscription_item_id: p.stripeSubscriptionItemId,
      period_start: p.periodStart.toISOString(),
      period_end: p.periodEnd.toISOString(),
      recorded_to_stripe: false,
    })
    .select("id")
    .single();
  if (error || !row) {
    // Não falhamos a operação da usuária só por causa de metered. Loggar.
    // eslint-disable-next-line no-console
    console.error("usage_records insert falhou:", error?.message);
    return;
  }

  // 2) Stripe metered.
  try {
    const stripe = getStripe();
    const usageRecord = await stripe.subscriptionItems.createUsageRecord(
      p.stripeSubscriptionItemId,
      {
        quantity: p.quantity ?? 1,
        timestamp: Math.floor(p.periodStart.getTime() / 1000),
        action: "increment",
      },
      { idempotencyKey: `usage_${row.id}` },
    );
    await admin
      .from("usage_records")
      .update({
        recorded_to_stripe: true,
        stripe_usage_record_id: (usageRecord as { id: string }).id,
      })
      .eq("id", row.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    // eslint-disable-next-line no-console
    console.error(`Stripe metered falhou (registro ${row.id}):`, message);
    // Mantém recorded_to_stripe=false para reconciliação posterior.
  }
}

/**
 * Reconciliação: reenvia para o Stripe registros pendentes.
 * Roda via cron (Vercel Cron ou QStash schedule — ainda não implementado,
 * basta chamar `reconciliarUsoPendente()` uma vez por dia).
 */
export async function reconciliarUsoPendente(limit = 200): Promise<{
  processados: number;
  erros: number;
}> {
  const admin = createAdminClient();
  const stripe = getStripe();
  const { data: pendentes } = await admin
    .from("usage_records")
    .select("id, stripe_subscription_item_id, quantity, period_start")
    .eq("recorded_to_stripe", false)
    .not("stripe_subscription_item_id", "is", null)
    .limit(limit);

  let processados = 0;
  let erros = 0;
  for (const r of pendentes ?? []) {
    if (!r.stripe_subscription_item_id) continue;
    try {
      const usageRecord = await stripe.subscriptionItems.createUsageRecord(
        r.stripe_subscription_item_id,
        {
          quantity: r.quantity,
          timestamp: Math.floor(new Date(r.period_start).getTime() / 1000),
          action: "increment",
        },
        { idempotencyKey: `usage_${r.id}` },
      );
      await admin
        .from("usage_records")
        .update({
          recorded_to_stripe: true,
          stripe_usage_record_id: (usageRecord as { id: string }).id,
        })
        .eq("id", r.id);
      processados++;
    } catch (err) {
      const message = err instanceof Error ? err.message : "unknown";
      // eslint-disable-next-line no-console
      console.error(`Reconciliação falhou (${r.id}):`, message);
      erros++;
    }
  }
  return { processados, erros };
}

/** Helper para uso em testes: descobre o subscription_item_id do Stripe. */
export async function obterSubscriptionItemId(
  subscriptionId: string,
  kind: UsageKind,
): Promise<string | null> {
  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });
  const _k = KIND_TO_SUBSCRIPTION_ITEM[kind];
  // Heurística: itens metered têm price.recurring.usage_type === 'metered'.
  const item = (sub as Stripe.Subscription).items.data.find(
    (i) => i.price.recurring?.usage_type === "metered" && (i.price.metadata?.kind ?? "") === _k,
  );
  return item?.id ?? null;
}
