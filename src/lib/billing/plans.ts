import { z } from "zod";
import { env } from "@/lib/env";

/**
 * Catálogo de planos (B3). Fonte de verdade única — UI e validações leem daqui.
 * `precoCentavosBRL` é derivado de `precoBRL * 100` para o Stripe.
 *
 * Limites `null` = ilimitado; `0` = nada incluso (apenas metered cobra).
 * `payg` é cobrado por uso puro; demais planos têm cota inclusa + overage.
 */

export const PLAN_IDS = [
  "free",
  "essencial",
  "profissional",
  "clinica",
  "payg",
  "vitalicio",
] as const;
export type PlanId = (typeof PLAN_IDS)[number];

export type Plano = {
  id: PlanId;
  nome: string;
  descricao: string;
  precoCentavosBRL: number; // 0 para free/payg/vitalicio
  /** ID do Price no Stripe (recurring). null para free/vitalicio. */
  stripePriceId: string | null;
  /** Para payg: preço do item base (assinatura com 0 valor + metered). */
  stripePaygBasePriceId?: string | null;
  /** Para payg: IDs dos 3 items metered. */
  stripePaygChatPriceId?: string | null;
  stripePaygReportPriceId?: string | null;
  stripePaygVisionPriceId?: string | null;
  /** Limites inclusos na assinatura. `null` = ilimitado; `0` = nada incluso. */
  limiteAlunos: number | null;
  limiteChat: number | null;
  limiteRelatorios: number | null;
  limiteVision: number | null;
  limiteUsuarias: number | null;
  /** Trial em dias (apenas para planos pagos com cartão/trial habilitado). */
  trialDias: number;
  /** Permite upgrade/downgrade. */
  permiteMudar: boolean;
  /** O que está incluso em destaque (UI de comparativo). */
  destaques: string[];
};

const e = () => {
  try {
    return env();
  } catch {
    // Permite carregar o catálogo mesmo sem env completo (ex: build, testes).
    return {} as ReturnType<typeof env>;
  }
};

export const PLANOS: Record<PlanId, Plano> = {
  free: {
    id: "free",
    nome: "Gratuito",
    descricao: "Para experimentar o FísioPilates.",
    precoCentavosBRL: 0,
    stripePriceId: null,
    limiteAlunos: 3,
    limiteChat: 50,
    limiteRelatorios: 1,
    limiteVision: 0,
    limiteUsuarias: 1,
    trialDias: 0,
    permiteMudar: true,
    destaques: ["Até 3 alunas ativas", "50 mensagens no chat/mês", "1 relatório de IA/mês"],
  },
  essencial: {
    id: "essencial",
    nome: "Essencial",
    descricao: "Para fisioterapeutas autônomas em crescimento.",
    precoCentavosBRL: 4990,
    stripePriceId: e().STRIPE_PRICE_ESSENCIAL ?? null,
    limiteAlunos: 20,
    limiteChat: 500,
    limiteRelatorios: 10,
    limiteVision: 3,
    limiteUsuarias: 1,
    trialDias: 14,
    permiteMudar: true,
    destaques: [
      "Até 20 alunas ativas",
      "500 mensagens no chat/mês",
      "10 relatórios de IA/mês",
      "3 fotos posturais (vision)",
    ],
  },
  profissional: {
    id: "profissional",
    nome: "Profissional",
    descricao: "Para quem quer escalar a carteira sem limite.",
    precoCentavosBRL: 9990,
    stripePriceId: e().STRIPE_PRICE_PROFISSIONAL ?? null,
    limiteAlunos: null,
    limiteChat: 2000,
    limiteRelatorios: 50,
    limiteVision: null,
    limiteUsuarias: 1,
    trialDias: 14,
    permiteMudar: true,
    destaques: [
      "Alunas ilimitadas",
      "2.000 mensagens no chat/mês",
      "50 relatórios de IA/mês",
      "Vision ilimitado",
    ],
  },
  clinica: {
    id: "clinica",
    nome: "Clínica",
    descricao: "Para times pequenos e estúdios com até 5 profissionais.",
    precoCentavosBRL: 19990,
    stripePriceId: e().STRIPE_PRICE_CLINICA ?? null,
    limiteAlunos: null,
    limiteChat: 10000,
    limiteRelatorios: null,
    limiteVision: null,
    limiteUsuarias: 5,
    trialDias: 14,
    permiteMudar: true,
    destaques: [
      "Tudo do Profissional",
      "Até 5 profissionais no tenant",
      "Relatórios e uso ilimitados",
    ],
  },
  payg: {
    id: "payg",
    nome: "Pay-as-you-go",
    descricao: "Sem mensalidade. Pague só pelo que usar.",
    precoCentavosBRL: 0,
    stripePriceId: e().STRIPE_PRICE_PAYG_BASE ?? null,
    stripePaygBasePriceId: e().STRIPE_PRICE_PAYG_BASE ?? null,
    stripePaygChatPriceId: e().STRIPE_PRICE_PAYG_CHAT ?? null,
    stripePaygReportPriceId: e().STRIPE_PRICE_PAYG_REPORT ?? null,
    stripePaygVisionPriceId: e().STRIPE_PRICE_PAYG_VISION ?? null,
    limiteAlunos: null,
    limiteChat: 0,
    limiteRelatorios: 0,
    limiteVision: 0,
    limiteUsuarias: 1,
    trialDias: 0,
    permiteMudar: true,
    destaques: [
      "Sem mensalidade",
      "Chat: R$ 0,10 por mensagem",
      "Relatório: R$ 3,00 por unidade",
      "Vision: R$ 0,50 por foto",
    ],
  },
  vitalicio: {
    id: "vitalicio",
    nome: "Premium",
    descricao: "Acesso completo a todos os recursos, sem limites.",
    precoCentavosBRL: 0,
    stripePriceId: null,
    limiteAlunos: null,
    limiteChat: null,
    limiteRelatorios: null,
    limiteVision: null,
    limiteUsuarias: 1,
    trialDias: 0,
    permiteMudar: false,
    destaques: [
      "Alunas ilimitadas",
      "Mensagens no chat ilimitadas",
      "Relatórios de IA ilimitados",
      "Fotos posturais ilimitadas",
    ],
  },
};

export const PLANOS_PAGOS_COM_CARTAO: PlanId[] = ["essencial", "profissional", "clinica", "payg"];

export function planoPorId(id: string | null | undefined): Plano {
  if (!id) return PLANOS.free;
  if (id in PLANOS) return PLANOS[id as PlanId];
  return PLANOS.free;
}

export function precoBRLFormatado(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function precoPlanoFormatado(p: Plano): string {
  if (p.precoCentavosBRL === 0) return "Grátis";
  return `${precoBRLFormatado(p.precoCentavosBRL)}/mês`;
}

export const criarCheckoutSchema = z.object({
  planId: z.enum(PLAN_IDS),
  modo: z.enum(["subscription"]).default("subscription"),
});

/** Valida invariantes do catálogo em runtime (chamado em testes e no boot). */
export function validarCatalogo(): { ok: boolean; erros: string[] } {
  const erros: string[] = [];
  for (const id of PLAN_IDS) {
    const p = PLANOS[id];
    if (!p) {
      erros.push(`Plano ${id} ausente do catálogo`);
      continue;
    }
    if (p.id !== id) erros.push(`Plano ${id} tem id errado: ${p.id}`);
    if (p.nome.length === 0) erros.push(`Plano ${id} sem nome`);
    if (p.precoCentavosBRL < 0) erros.push(`Plano ${id} tem preço negativo`);
    if (p.limiteAlunos !== null && p.limiteAlunos < 0)
      erros.push(`Plano ${id} tem limiteAlunos negativo`);
  }
  return { ok: erros.length === 0, erros };
}
