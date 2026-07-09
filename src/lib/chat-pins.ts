/**
 * Item de contexto fixado numa conversa do assistente. Compartilhado entre
 * cliente (UI de anexar) e servidor (injeção no prompt). O contexto real é
 * resolvido no servidor de forma PSEUDONIMIZADA (ver src/server/chat-context.ts).
 */
export type PinTipo = "aluno" | "plano" | "relatorio";

export type PinnedItem = {
  tipo: PinTipo;
  id: string;
  rotulo: string;
};

export const ROTULO_TIPO: Record<PinTipo, string> = {
  aluno: "Aluno",
  plano: "Plano de aula",
  relatorio: "Relatório",
};

/** Valida/normaliza o array vindo do banco (jsonb) ou do cliente. */
export function parsePinned(raw: unknown): PinnedItem[] {
  if (!Array.isArray(raw)) return [];
  const tipos: PinTipo[] = ["aluno", "plano", "relatorio"];
  return raw.filter(
    (p): p is PinnedItem =>
      !!p &&
      typeof p === "object" &&
      tipos.includes((p as PinnedItem).tipo) &&
      typeof (p as PinnedItem).id === "string" &&
      typeof (p as PinnedItem).rotulo === "string",
  );
}
