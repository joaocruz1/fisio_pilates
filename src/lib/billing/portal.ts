import "server-only";
import { env } from "@/lib/env";
import { getStripe } from "@/lib/stripe/client";

/**
 * Portal de autoatendimento do Stripe (B9).
 * A usuária gerencia cartão, faturas e cancela por lá.
 */

export async function criarPortalSession(opts: {
  tenantId: string;
  returnUrl: string;
}): Promise<string> {
  const stripe = getStripe();
  const { url } = await stripe.billingPortal.sessions.create({
    customer: await obterOuCriarCustomerId(opts.tenantId),
    return_url: opts.returnUrl,
  });
  if (!url) throw new Error("Stripe não retornou URL do portal");
  return url;
}

/**
 * Cria ou recupera o customer do Stripe para o tenant (B8).
 * Metadata inclui `tenant_id` (usado pelo webhook para fazer o sync).
 */
export async function obterOuCriarCustomerId(tenantId: string): Promise<string> {
  // Import dinâmico para evitar ciclo em testes.
  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  const { data: tenant } = await admin
    .from("tenants")
    .select("stripe_customer_id, name")
    .eq("id", tenantId)
    .single();
  if (tenant?.stripe_customer_id) return tenant.stripe_customer_id;

  const stripe = getStripe();
  const customer = await stripe.customers.create({
    metadata: { tenant_id: tenantId },
    name: tenant?.name ?? undefined,
  });
  await admin.from("tenants").update({ stripe_customer_id: customer.id }).eq("id", tenantId);
  return customer.id;
}

export function successUrl(): string {
  return `${env().APP_URL}/configuracoes/assinatura/sucesso?session_id={CHECKOUT_SESSION_ID}`;
}

export function cancelUrl(): string {
  return `${env().APP_URL}/configuracoes/assinatura/cancelado`;
}
