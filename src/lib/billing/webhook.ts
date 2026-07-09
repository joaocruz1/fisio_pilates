import "server-only";
import {
  onCheckoutCompleted,
  onInvoicePaid,
  onInvoicePaymentFailed,
  onSubscriptionDeleted,
  onSubscriptionUpdated,
  onTrialWillEnd,
} from "@/lib/billing/sync";
import { env } from "@/lib/env";
import { getStripe, type StripeEvent } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Processa 1 evento do webhook Stripe (B8, B18).
 * - Verifica assinatura (via `constructEvent` no handler da rota).
 * - Deduplica via `stripe_events` (B18): se id já existe, retorna 200 sem reprocessar.
 * - Roteia por event.type.
 *
 * Esta função é chamada APÓS verificação de assinatura e parse do body.
 */

export type ProcessarResultado =
  | { ok: true; deduped: boolean; erro?: undefined }
  | { ok: false; deduped?: undefined; erro: string };

export async function processarEvento(event: StripeEvent): Promise<ProcessarResultado> {
  const admin = createAdminClient();
  const _e = env();

  // 1) Idempotência — inserir em stripe_events. Se já existe, dedup.
  const { data: existing } = await admin
    .from("stripe_events")
    .select("id")
    .eq("id", event.id)
    .maybeSingle();
  if (existing) {
    return { ok: true, deduped: true };
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
        await onCheckoutCompleted(event.data.object as never);
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
        await onSubscriptionUpdated(event.data.object as never);
        break;
      case "customer.subscription.deleted":
        await onSubscriptionDeleted(event.data.object as never);
        break;
      case "customer.subscription.trial_will_end":
        await onTrialWillEnd(event.data.object as never);
        break;
      case "invoice.paid":
      case "invoice.payment_succeeded":
        await onInvoicePaid(event.data.object as never);
        break;
      case "invoice.payment_failed":
        await onInvoicePaymentFailed(event.data.object as never);
        break;
      default:
        // Evento não tratado — só registramos no log.
        break;
    }
    await admin.from("stripe_events").insert({
      id: event.id,
      type: event.type,
      processed_at: new Date().toISOString(),
      payload: event as never,
    });
    return { ok: true, deduped: false };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    // eslint-disable-next-line no-console
    console.error(`[stripe-webhook] ${event.type} falhou:`, message);
    return { ok: false, erro: message };
  }
}

/**
 * Helper para testes/handler: constrói evento verificado.
 * Nunca chamar fora do handler HTTP.
 */
export function verificarAssinatura(rawBody: string, signature: string): StripeEvent {
  const stripe = getStripe();
  const e = env();
  return stripe.webhooks.constructEvent(rawBody, signature, e.STRIPE_WEBHOOK_SECRET);
}
