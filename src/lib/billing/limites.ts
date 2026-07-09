import "server-only";
import { type PlanId, planoPorId } from "@/lib/billing/plans";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Limites por plano (B15). Cada função:
 *  - lê `tenants.plan` (servidor autenticado);
 *  - conta uso atual via queries com RLS;
 *  - lança erro amigável em pt-BR se a cota foi estourada.
 *
 * Regra: limite `null` = ilimitado; `0` = nada incluso (PAYG).
 * tenant `vitalicio` sempre passa; `free`/`payg`/pagos validam conforme catálogo.
 */

export class LimiteExcedidoError extends Error {
  constructor(
    public readonly motivo: string,
    public readonly upgradeUrl: string = "/configuracoes/assinatura",
  ) {
    super(motivo);
    this.name = "LimiteExcedidoError";
  }
}

function inicioDoMesISO(): string {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString();
}

async function carregarPlano(tenantId: string): Promise<{
  planId: PlanId;
  status: string;
  admin: ReturnType<typeof createAdminClient>;
}> {
  const admin = createAdminClient();
  // Usa admin para ler o plan (service_role) — checagem é regra de código (B15).
  // A RLS não muda: a checagem é feita aqui, no servidor, e lançada como erro.
  const { data: tenant } = await admin
    .from("tenants")
    .select("plan, status")
    .eq("id", tenantId)
    .single();
  return {
    planId: (tenant?.plan ?? "free") as PlanId,
    status: tenant?.status ?? "active",
    admin,
  };
}

/** Conta alunas ativas (não soft-deletadas) do tenant. */
export async function contarAlunas(tenantId: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .is("deleted_at", null);
  return count ?? 0;
}

/** Conta mensagens de chat no mês atual. */
export async function contarChatMes(tenantId: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("ai_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("kind", "chat")
    .gte("created_at", inicioDoMesISO());
  return count ?? 0;
}

/** Conta relatórios de IA no mês. */
export async function contarRelatoriosMes(tenantId: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("ai_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("kind", "report")
    .gte("created_at", inicioDoMesISO());
  return count ?? 0;
}

/** Conta fotos posturais (vision) no mês. */
export async function contarVisionMes(tenantId: string): Promise<number> {
  const admin = createAdminClient();
  const { count } = await admin
    .from("ai_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("tenant_id", tenantId)
    .eq("kind", "vision")
    .gte("created_at", inicioDoMesISO());
  return count ?? 0;
}

// ----------------------------------------------------------------------------
// Assertions — chamam antes da mutação
// ----------------------------------------------------------------------------

export async function assertLimiteAlunos(tenantId: string): Promise<void> {
  const { planId } = await carregarPlano(tenantId);
  if (planId === "vitalicio") return;
  const plano = planoPorId(planId);
  if (plano.limiteAlunos === null) return;
  const atual = await contarAlunas(tenantId);
  if (atual >= plano.limiteAlunos) {
    throw new LimiteExcedidoError(
      `Você atingiu o limite de ${plano.limiteAlunos} alunas ativas do plano ${plano.nome}. Faça upgrade para adicionar mais.`,
    );
  }
}

export async function assertLimiteChat(tenantId: string): Promise<void> {
  const { planId } = await carregarPlano(tenantId);
  if (planId === "vitalicio") return;
  const plano = planoPorId(planId);
  if (plano.limiteChat === null) return;
  if (plano.limiteChat === 0) {
    // PAYG: não bloqueia, apenas marca o registro para cobrança (B5).
    return;
  }
  const atual = await contarChatMes(tenantId);
  if (atual >= plano.limiteChat) {
    throw new LimiteExcedidoError(
      `Você atingiu o limite de ${plano.limiteChat} mensagens no chat/mês do plano ${plano.nome}. O excedente é cobrado automaticamente, ou faça upgrade.`,
    );
  }
}

export async function assertLimiteRelatorio(tenantId: string): Promise<void> {
  const { planId } = await carregarPlano(tenantId);
  if (planId === "vitalicio") return;
  const plano = planoPorId(planId);
  if (plano.limiteRelatorios === null) return;
  if (plano.limiteRelatorios === 0) return; // PAYG
  const atual = await contarRelatoriosMes(tenantId);
  if (atual >= plano.limiteRelatorios) {
    throw new LimiteExcedidoError(
      `Você atingiu o limite de ${plano.limiteRelatorios} relatórios de IA/mês do plano ${plano.nome}. O excedente é cobrado automaticamente, ou faça upgrade.`,
    );
  }
}

export async function assertLimiteVision(tenantId: string): Promise<void> {
  const { planId } = await carregarPlano(tenantId);
  if (planId === "vitalicio") return;
  const plano = planoPorId(planId);
  if (plano.limiteVision === null) return;
  if (plano.limiteVision === 0) return; // PAYG ou free
  const atual = await contarVisionMes(tenantId);
  if (atual >= plano.limiteVision) {
    throw new LimiteExcedidoError(
      `Você atingiu o limite de ${plano.limiteVision} fotos posturais (vision)/mês do plano ${plano.nome}. O excedente é cobrado automaticamente, ou faça upgrade.`,
    );
  }
}

/** Resumo completo para UI de "uso do plano". */
export async function resumoUso(tenantId: string) {
  const { planId } = await carregarPlano(tenantId);
  const plano = planoPorId(planId);
  const [alunos, chat, relatorios, vision] = await Promise.all([
    contarAlunas(tenantId),
    contarChatMes(tenantId),
    contarRelatoriosMes(tenantId),
    contarVisionMes(tenantId),
  ]);
  return { planId, plano, alunos, chat, relatorios, vision };
}
