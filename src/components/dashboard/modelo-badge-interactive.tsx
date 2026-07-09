"use client";

import { LightningIcon, SparkleIcon, TrophyIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { NIVEL_PRECISAO, NIVEL_VELOCIDADE, type NivelModelo } from "@/lib/ai/modelos";
import { textos } from "@/lib/textos";
import { cn } from "@/lib/utils";
import { atualizarPreferenciasIA } from "@/server/actions/preferencias";

/** Shape mínimo que o client precisa — espelha `PreferenciasIA` mas sem importar de `server-only`. */
type PreferenciasCliente = {
  chat: NivelModelo;
  report: NivelModelo;
  vision: "economico" | "alta_precisao";
};

type Props = {
  initial: PreferenciasCliente;
};

const ICONE: Record<NivelModelo, typeof SparkleIcon> = {
  economico: LightningIcon,
  balanceado: SparkleIcon,
  alta_precisao: TrophyIcon,
};

const OPCOES: ReadonlyArray<NivelModelo> = ["economico", "balanceado", "alta_precisao"];

/**
 * Indicador interativo no header do dashboard. Mostra o nível atual da IA
 * (relatório = maior impacto de custo) e permite trocar direto sem ir a
 * /configuracoes. Visual: ícone do nível + 2 mini-barras de
 * velocidade (decrescente) e precisão (crescente).
 *
 * Client component: optimistic update do `report` e reverte em erro.
 * Mantém `chat` e `vision` do estado atual.
 */
export function ModeloBadgeInteractive({ initial }: Props) {
  const router = useRouter();
  const [report, setReport] = useState<NivelModelo>(initial.report);
  const [chat] = useState<NivelModelo>(initial.chat);
  const [vision] = useState<PreferenciasCliente["vision"]>(initial.vision);
  const [pending, startTransition] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const atual = report;
  const label = textos.modelo.niveis[atual].label;
  const Icone = ICONE[atual];
  const velocidade = NIVEL_VELOCIDADE[atual];
  const precisao = NIVEL_PRECISAO[atual];

  function trocar(novo: NivelModelo) {
    if (novo === report || pending) return;
    const anterior = report;
    setReport(novo);
    setErro(null);
    startTransition(async () => {
      const res = await atualizarPreferenciasIA({
        chat,
        report: novo,
        vision,
      });
      if (!res.ok) {
        setReport(anterior);
        setErro(res.erro);
        return;
      }
      // Garante que outras páginas (chat, relatórios) vejam o novo nível.
      router.refresh();
    });
  }

  return (
    <div
      data-tour="dash-modelo"
      className="inline-flex items-center gap-2 rounded-full border bg-muted/40 px-2 py-1 text-xs"
    >
      <div className="flex items-center gap-1.5" title={`${textos.modelo.badge}: ${label}`}>
        <Icone className="size-3.5 text-primary" weight="duotone" aria-hidden="true" />
        <span className="font-medium text-foreground/80">{label}</span>
      </div>
      <span className="h-3 w-px bg-border" aria-hidden="true" />
      <EixosInline velocidade={velocidade} precisao={precisao} />
      <span className="h-3 w-px bg-border" aria-hidden="true" />
      <div role="radiogroup" aria-label={textos.modelo.titulo} className="flex">
        {OPCOES.map((n) => {
          const IconeOp = ICONE[n];
          const ativo = n === report;
          const titulo = `${textos.modelo.niveis[n].label} — ${textos.modelo.niveis[n].custo}`;
          return (
            // biome-ignore lint/a11y/useSemanticElements: radio segmentado precisa de <button> estilizável
            <button
              key={n}
              type="button"
              role="radio"
              aria-checked={ativo}
              aria-label={titulo}
              title={titulo}
              disabled={pending}
              onClick={() => trocar(n)}
              className={cn(
                "flex size-5 items-center justify-center rounded-full transition-colors",
                ativo
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground/50 hover:text-foreground",
              )}
            >
              <IconeOp className="size-3" weight="duotone" />
            </button>
          );
        })}
      </div>
      {erro ? (
        <WarningCircleIcon className="size-3.5 text-destructive" weight="fill" aria-label={erro} />
      ) : null}
    </div>
  );
}

/** Barras crescentes/decrescentes pros 2 eixos — visual compacto. */
function EixosInline({ velocidade, precisao }: { velocidade: 1 | 2 | 3; precisao: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-1.5" aria-hidden="true">
      <Barras eixo="velocidade" nivel={velocidade} />
      <span className="text-muted-foreground/40">·</span>
      <Barras eixo="precisao" nivel={precisao} />
    </div>
  );
}

function Barras({ eixo, nivel }: { eixo: "velocidade" | "precisao"; nivel: 1 | 2 | 3 }) {
  // Velocidade: do mais lento (esquerda) pro mais rápido (direita)
  // Precisão: da mais baixa (esquerda) pra mais alta (direita)
  return (
    <span className="inline-flex items-end gap-px">
      {[1, 2, 3].map((i) => {
        const preenchida = i <= nivel;
        return (
          <span
            key={i}
            className={cn(
              "w-[3px] rounded-sm transition-colors",
              i === 1 && "h-1.5",
              i === 2 && "h-2.5",
              i === 3 && "h-3.5",
              preenchida
                ? eixo === "velocidade"
                  ? "bg-info"
                  : "bg-primary"
                : "bg-muted-foreground/20",
            )}
          />
        );
      })}
    </span>
  );
}
