import { Badge } from "@/components/ui/badge";
import { type PlanId, planoPorId } from "@/lib/billing/plans";

const TONE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  free: "outline",
  trial: "outline",
  payg: "secondary",
  vitalicio: "default",
  essencial: "default",
  profissional: "default",
  clinica: "default",
};

export function PlanoBadge({ plan }: { plan: string | null | undefined }) {
  const id = (plan ?? "free") as PlanId;
  const plano = planoPorId(id);
  return <Badge variant={TONE[id] ?? "outline"}>{plano.nome}</Badge>;
}
