"use client";

import { SparkleIcon } from "@phosphor-icons/react/dist/ssr";
import { useEffect, useState } from "react";
import { PLANOS, type PlanId, precoBRLFormatado } from "@/lib/billing/plans";
import { textos } from "@/lib/textos";

/**
 * Mostra um aviso amigável quando o visitante chegou ao cadastro tendo
 * escolhido um plano na landing (`/cadastro?plan=<id>`). Persistimos a escolha
 * em `localStorage` para o `CheckoutButtonPublic` poder reaproveitar depois do
 * login, mas aqui só exibimos o plano como dica.
 */
export function PlanHint() {
  const [plano, setPlano] = useState<PlanId | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("plan") as PlanId | null;
    const fromStorage = window.localStorage.getItem("fp:pending-plan") as PlanId | null;
    const id = fromQuery ?? fromStorage;
    if (id && id in PLANOS && id !== "free" && id !== "vitalicio") {
      setPlano(id);
    }
    if (fromQuery && PLANOS[fromQuery as PlanId]) {
      window.localStorage.setItem("fp:pending-plan", fromQuery);
    }
  }, []);

  if (!plano) return null;
  const p = PLANOS[plano];

  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-brand-gradient text-primary-foreground">
        <SparkleIcon weight="fill" className="size-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-foreground">
          {textos.auth.planoEscolhidoTitulo} {p.nome}
        </div>
        <div className="text-xs text-muted-foreground">
          {textos.auth.planoEscolhidoDesc}{" "}
          <strong className="text-foreground">
            {p.precoCentavosBRL > 0 ? `${precoBRLFormatado(p.precoCentavosBRL)}/mês` : ""}
            {p.trialDias > 0 ? ` · ${p.trialDias} dias grátis` : ""}
          </strong>
          .
        </div>
      </div>
    </div>
  );
}
