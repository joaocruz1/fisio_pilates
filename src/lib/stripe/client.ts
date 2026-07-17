import "server-only";
import Stripe from "stripe";
import { env } from "@/lib/env";

/**
 * Singleton do SDK Stripe. Lazy init para não derrubar o build/build de tipos
 * se as envs não estiverem presentes. Só chame de código de servidor.
 */
let cached: Stripe | null = null;

export function getStripe(): Stripe {
  if (cached) return cached;
  const e = env();
  cached = new Stripe(e.STRIPE_SECRET_KEY, {
    // Pinado no tipo do SDK instalado (pode mudar conforme versão).
    apiVersion: "2025-02-24.acacia" as Stripe.LatestApiVersion,
    typescript: true,
    appInfo: {
      name: "FísioPilates",
      version: "1.0.0",
    },
  });
  return cached;
}

/** Versão "raw" do evento Stripe após validar a assinatura do webhook. */
export type StripeEvent = Stripe.Event;
