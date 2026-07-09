import "server-only";
import type Stripe from "stripe";
import type { PlanId } from "@/lib/billing/plans";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Sincronização Stripe → banco (B8).
 * Webhook é o ÚNICO caminho de mutação de assinatura. Esta função é
 * invocada por `processarEvento` em `src/lib/billing/webhook.ts`.
 *
 * Princípios:
 *  - Tudo via service_role (RLS bypassa; filtro por tenant_id vem do
 *    metadata do objeto Stripe — fonte de verdade).
 *  - Idempotente: usa `stripe_events` para dedup, e `upsert` por IDs únicos.
 *  - Defesa em profundidade: ignora eventos cujo `metadata.tenant_id`
 *    corresponde a um tenant `plan='vitalicio'` (B7).
 */

function mapStatusToTenant(status: Stripe.Subscription.Status): {
  tenantStatus: "active" | "suspended" | "deleted" | "past_due";
  plan: PlanId;
} {
  if (status === "active" || status === "trialing")
    return { tenantStatus: "active", plan: "essencial" };
  if (status === "past_due" || status === "unpaid")
    return { tenantStatus: "past_due", plan: "essencial" };
  if (status === "canceled" || status === "incomplete_expired")
    return { tenantStatus: "active", plan: "free" };
  // incomplete / paused — ainda não ativou, mas mantém tenant ativo.
  return { tenantStatus: "active", plan: "free" };
}

function mapMetadataToPlanId(metadata: Stripe.Metadata | null | undefined): PlanId {
  const id = metadata?.plan_id;
  if (id && ["essencial", "profissional", "clinica", "payg"].includes(id)) {
    return id as PlanId;
  }
  return "essencial";
}

async function vitalicioGuard(tenantId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin.from("tenants").select("plan").eq("id", tenantId).single();
  return data?.plan === "vitalicio";
}

// ----------------------------------------------------------------------------
// Handlers de evento
// ----------------------------------------------------------------------------

function customerMetadata(tenantIdSource: unknown): string | null {
  if (!tenantIdSource || typeof tenantIdSource === "string") return null;
  return (tenantIdSource as { metadata?: { tenant_id?: string } }).metadata?.tenant_id ?? null;
}

function safeCustomerMetadata(c: unknown): string | null {
  if (!c || typeof c === "string") return null;
  return customerMetadata(c);
}

export async function onCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  if (!session.subscription || !session.customer) return;
  const tenantId = session.metadata?.tenant_id ?? safeCustomerMetadata(session.customer);
  if (!tenantId) return;
  if (await vitalicioGuard(tenantId)) return;

  const stripe = getStripe();
  const subscriptionId =
    typeof session.subscription === "string" ? session.subscription : session.subscription.id;
  const customerId = typeof session.customer === "string" ? session.customer : session.customer.id;
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await upsertSubscription(tenantId, customerId, subscription);
}

export async function onSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  const tenantId = subscription.metadata?.tenant_id ?? safeCustomerMetadata(subscription.customer);
  if (!tenantId) return;
  if (await vitalicioGuard(tenantId)) return;

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer.id;
  await upsertSubscription(tenantId, customerId, subscription);
}

export async function onSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  const tenantId = subscription.metadata?.tenant_id ?? safeCustomerMetadata(subscription.customer);
  if (!tenantId) return;
  if (await vitalicioGuard(tenantId)) return;

  const admin = createAdminClient();
  await admin
    .from("tenants")
    .update({
      plan: "free",
      status: "active",
      stripe_subscription_id: null,
      cancel_at_period_end: false,
      canceled_at: new Date().toISOString(),
      current_period_end: null,
      current_period_start: null,
      trial_ends_at: null,
    })
    .eq("id", tenantId);

  await admin
    .from("subscriptions")
    .update({
      status: "canceled",
      canceled_at: new Date().toISOString(),
    })
    .eq("stripe_subscription_id", subscription.id);
}

export async function onInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  await upsertInvoice(invoice, "paid");
}

export async function onInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  await upsertInvoice(invoice, "open");
  // B11: marcar tenant como past_due (sem suspender imediatamente; Stripe retenta).
  const tenantId = (invoice as unknown as { customer_metadata?: { tenant_id?: string } })
    .customer_metadata?.tenant_id;
  if (!tenantId) return;
  if (await vitalicioGuard(tenantId)) return;
  const admin = createAdminClient();
  await admin.from("tenants").update({ status: "past_due" }).eq("id", tenantId);
}

export async function onTrialWillEnd(subscription: Stripe.Subscription): Promise<void> {
  const tenantId = subscription.metadata?.tenant_id ?? safeCustomerMetadata(subscription.customer);
  if (!tenantId) return;
  if (await vitalicioGuard(tenantId)) return;
  const admin = createAdminClient();
  if (!subscription.trial_end) return;
  await admin
    .from("tenants")
    .update({ trial_ends_at: new Date(subscription.trial_end * 1000).toISOString() })
    .eq("id", tenantId);
}

// ----------------------------------------------------------------------------
// Upserts (idempotentes por stripe_*_id unique)
// ----------------------------------------------------------------------------

async function upsertSubscription(
  tenantId: string,
  customerId: string,
  subscription: Stripe.Subscription,
): Promise<void> {
  const admin = createAdminClient();
  const planId = mapMetadataToPlanId(subscription.metadata);
  const { tenantStatus } = mapStatusToTenant(subscription.status);

  // B20: mapa metered items (chat/report/vision) por price.metadata.kind.
  const itemsMetadata: Record<string, string> = {};
  for (const item of subscription.items.data) {
    const k = item.price.metadata?.kind;
    if (k === "chat" || k === "report" || k === "vision") {
      itemsMetadata[k] = item.id;
    }
  }
  const metadataFinal: Record<string, string> = {
    ...(subscription.metadata as Record<string, string>),
    items: JSON.stringify(itemsMetadata),
  };

  await admin.from("subscriptions").upsert(
    {
      tenant_id: tenantId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: customerId,
      plan: planId,
      status: subscription.status,
      current_period_start: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000).toISOString()
        : null,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      trial_start: subscription.trial_start
        ? new Date(subscription.trial_start * 1000).toISOString()
        : null,
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
      metadata: metadataFinal,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "stripe_subscription_id" },
  );

  await admin
    .from("tenants")
    .update({
      plan: planId,
      status: tenantStatus,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      current_period_start: subscription.current_period_start
        ? new Date(subscription.current_period_start * 1000).toISOString()
        : null,
      current_period_end: subscription.current_period_end
        ? new Date(subscription.current_period_end * 1000).toISOString()
        : null,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
      trial_ends_at: subscription.trial_end
        ? new Date(subscription.trial_end * 1000).toISOString()
        : null,
    })
    .eq("id", tenantId);
}

async function upsertInvoice(invoice: Stripe.Invoice, defaultStatus: string): Promise<void> {
  const tenantId = (invoice as unknown as { customer_metadata?: { tenant_id?: string } })
    .customer_metadata?.tenant_id;
  if (!tenantId) return;
  if (await vitalicioGuard(tenantId)) return;
  const admin = createAdminClient();
  await admin.from("invoices").upsert(
    {
      tenant_id: tenantId,
      stripe_invoice_id: invoice.id ?? "",
      stripe_subscription_id:
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : (invoice.subscription?.id ?? null),
      amount_cents: invoice.amount_paid || invoice.amount_due || 0,
      currency: invoice.currency ?? "brl",
      status: (invoice.status ?? defaultStatus) as
        | "draft"
        | "open"
        | "paid"
        | "uncollectible"
        | "void",
      hosted_invoice_url: invoice.hosted_invoice_url ?? null,
      invoice_pdf_url: invoice.invoice_pdf ?? null,
      period_start: invoice.period_start
        ? new Date(invoice.period_start * 1000).toISOString()
        : null,
      period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
      paid_at: invoice.status === "paid" ? new Date().toISOString() : null,
    },
    { onConflict: "stripe_invoice_id" },
  );
}
