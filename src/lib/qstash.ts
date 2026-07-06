import "server-only";
import { Client, Receiver } from "@upstash/qstash";
import { env } from "@/lib/env";

/** Cliente QStash para enfileirar o worker de ingestão (03-rag.md). */
export function qstashClient(): Client {
  return new Client({ token: env().QSTASH_TOKEN });
}

/** Verificador de assinatura das requisições vindas do QStash. */
export function qstashReceiver(): Receiver {
  const e = env();
  return new Receiver({
    currentSigningKey: e.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: e.QSTASH_NEXT_SIGNING_KEY,
  });
}
