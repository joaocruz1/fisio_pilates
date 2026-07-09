import "server-only";
import { Client, Receiver } from "@upstash/qstash";
import { env } from "@/lib/env";

/** Indica se o QStash está configurado (todas as chaves presentes). */
export function qstashConfigurado(): boolean {
  const e = env();
  return Boolean(e.QSTASH_TOKEN && e.QSTASH_CURRENT_SIGNING_KEY && e.QSTASH_NEXT_SIGNING_KEY);
}

/** Cliente QStash para enfileirar o worker de ingestão (03-rag.md). */
export function qstashClient(): Client {
  const token = env().QSTASH_TOKEN;
  if (!token) throw new Error("QStash não configurado (QSTASH_TOKEN ausente).");
  return new Client({ token });
}

/** Verificador de assinatura das requisições vindas do QStash. */
export function qstashReceiver(): Receiver {
  const e = env();
  if (!e.QSTASH_CURRENT_SIGNING_KEY || !e.QSTASH_NEXT_SIGNING_KEY) {
    throw new Error("QStash não configurado (chaves de assinatura ausentes).");
  }
  return new Receiver({
    currentSigningKey: e.QSTASH_CURRENT_SIGNING_KEY,
    nextSigningKey: e.QSTASH_NEXT_SIGNING_KEY,
  });
}
