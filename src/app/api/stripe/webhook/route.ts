import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { processarEvento, verificarAssinatura } from "@/lib/billing/webhook";

/**
 * POST /api/stripe/webhook
 *
 * Recebe eventos do Stripe, verifica assinatura e delega ao processador.
 * Sempre retorna 200 (a menos que a assinatura seja inválida — aí 400).
 * Idempotência via stripe_events (B18).
 *
 * Configurar no Dashboard Stripe: Developers > Webhooks > Add endpoint
 * URL: https://app.fisio-pilates.com/api/stripe/webhook
 * Eventos: checkout.session.completed, customer.subscription.*,
 *          invoice.paid, invoice.payment_failed, customer.subscription.trial_will_end
 */
export async function POST(req: Request): Promise<NextResponse> {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ erro: "stripe-signature ausente" }, { status: 400 });
  }
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = verificarAssinatura(rawBody, signature);
  } catch (err) {
    const message = err instanceof Error ? err.message : "assinatura inválida";
    return NextResponse.json({ erro: message }, { status: 400 });
  }

  const resultado = await processarEvento(event);
  if (!resultado.ok) {
    // 200 mesmo em erro de processamento (Stripe vai retentar se for 5xx);
    // retornamos 200 e gravamos o erro em stripe_events.error.
    return NextResponse.json({
      ok: false,
      erro: resultado.erro,
      deduped: resultado.deduped ?? false,
    });
  }
  return NextResponse.json({ ok: true, deduped: resultado.deduped });
}

// Necessário para que o Next 16 não tente parsear o body como JSON.
export const runtime = "nodejs";
