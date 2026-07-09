import { getPreferenciasIA } from "@/lib/ai/preferencias";
import { requireTenant } from "@/server/auth";
import { ModeloBadgeInteractive } from "./modelo-badge-interactive";

/**
 * Wrapper server component que lê a preferência de IA da usuária
 * e delega ao `ModeloBadgeInteractive` (client) para permitir troca
 * direta do nível de relatório sem sair do dashboard.
 *
 * Vision é narrowado pro subconjunto de 2 valores que o app aceita
 * (o enum do DB permite 3, mas o form/servidor nunca grava `balanceado`
 * em vision). Narrowing mantém o componente client sem importar de
 * `server-only`.
 */
export async function ModeloBadge() {
  const { user } = await requireTenant();
  const prefs = await getPreferenciasIA(user.id);
  return (
    <ModeloBadgeInteractive
      initial={{
        chat: prefs.chat,
        report: prefs.report,
        vision: (prefs.vision === "balanceado" ? "economico" : prefs.vision) as
          | "economico"
          | "alta_precisao",
      }}
    />
  );
}
