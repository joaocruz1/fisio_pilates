"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { criarCheckoutSchema, type PlanId, planoPorId } from "@/lib/billing/plans";
import {
  cancelUrl,
  criarPortalSession,
  obterOuCriarCustomerId,
  successUrl,
} from "@/lib/billing/portal";
import { getStripe } from "@/lib/stripe/client";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/server/actions/result";
import { requireTenant } from "@/server/auth";

/**
 * Server actions de billing (B4, B8, B9, B10).
 * Padrão: `{ ok: true, data } | { ok: false, erro }`; `revalidatePath` após mutação.
 */

/** Cria sessão de Checkout e devolve a URL. */
export async function criarCheckout(planId: PlanId): Promise<ActionResult<{ url: string }>> {
  const ctx = await requireTenant();
  if (ctx.tenant.plan === "vitalicio") {
    return { ok: false, erro: "Seu plano é vitalício e não pode ser alterado." };
  }
  const parsed = criarCheckoutSchema.safeParse({ planId });
  if (!parsed.success) return { ok: false, erro: "Plano inválido." };
  const plano = planoPorId(planId);
  if (planId === "free" || !plano.stripePriceId) {
    return { ok: false, erro: "Este plano não precisa de checkout." };
  }
  try {
    const stripe = getStripe();
    const customerId = await obterOuCriarCustomerId(ctx.tenant.id);
    const checkout = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: plano.stripePriceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: plano.trialDias || undefined,
        metadata: { tenant_id: ctx.tenant.id, plan_id: planId },
      },
      success_url: successUrl(),
      cancel_url: cancelUrl(),
      metadata: { tenant_id: ctx.tenant.id, plan_id: planId },
      allow_promotion_codes: true,
    });
    if (!checkout.url) return { ok: false, erro: "Stripe não retornou URL." };
    return { ok: true, data: { url: checkout.url } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return { ok: false, erro: `Erro ao criar checkout: ${message}` };
  }
}

/** Redireciona ao portal do Stripe (B9). */
export async function abrirPortal(returnPath = "/configuracoes/assinatura"): Promise<never> {
  const ctx = await requireTenant();
  const url = await criarPortalSession({
    tenantId: ctx.tenant.id,
    returnUrl: `${process.env.APP_URL ?? "http://localhost:3000"}${returnPath}`,
  });
  redirect(url);
}

/** Cancela assinatura no fim do período (B10). */
export async function cancelarAssinatura(): Promise<ActionResult> {
  const ctx = await requireTenant();
  if (!ctx.tenant.stripe_subscription_id) {
    return { ok: false, erro: "Você não tem uma assinatura ativa." };
  }
  try {
    const stripe = getStripe();
    await stripe.subscriptions.update(ctx.tenant.stripe_subscription_id, {
      cancel_at_period_end: true,
    });
    revalidatePath("/configuracoes/assinatura");
    revalidatePath("/configuracoes");
    return { ok: true, data: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return { ok: false, erro: `Erro ao cancelar: ${message}` };
  }
}

/** Reverte cancelamento agendado (B10). */
export async function reativarAssinatura(): Promise<ActionResult> {
  const ctx = await requireTenant();
  if (!ctx.tenant.stripe_subscription_id) {
    return { ok: false, erro: "Você não tem uma assinatura para reativar." };
  }
  try {
    const stripe = getStripe();
    await stripe.subscriptions.update(ctx.tenant.stripe_subscription_id, {
      cancel_at_period_end: false,
    });
    revalidatePath("/configuracoes/assinatura");
    revalidatePath("/configuracoes");
    return { ok: true, data: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : "unknown";
    return { ok: false, erro: `Erro ao reativar: ${message}` };
  }
}

/** Helper interno (não exposto como action): cancela assinatura no Stripe imediatamente. */
export async function cancelarAssinaturaImediato(tenantId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("stripe_subscription_id")
    .eq("id", tenantId)
    .single();
  if (!tenant?.stripe_subscription_id) return;
  const stripe = getStripe();
  await stripe.subscriptions.cancel(tenant.stripe_subscription_id);
}
