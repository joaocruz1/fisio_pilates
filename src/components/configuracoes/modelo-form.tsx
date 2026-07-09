"use client";

import { CheckCircleIcon, LightningIcon, SparkleIcon, TrophyIcon } from "@phosphor-icons/react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { NIVEL_PRECISAO, NIVEL_VELOCIDADE, type NivelModelo } from "@/lib/ai/modelos";
import type { NivelVision } from "@/lib/ai/preferencias";
import { textos } from "@/lib/textos";
import { cn } from "@/lib/utils";
import type { PreferenciasIAInput } from "@/lib/validators/preferencias-ia";
import { atualizarPreferenciasIA } from "@/server/actions/preferencias";

type Props = {
  defaultChat: NivelModelo;
  defaultReport: NivelModelo;
  defaultVision: NivelVision;
};

type Feature = "chat" | "relatorio" | "vision";

const FEATURES: ReadonlyArray<{
  key: Feature;
  label: string;
  ajuda: string;
  opcoes: ReadonlyArray<NivelModelo>;
}> = [
  {
    key: "chat",
    label: textos.modelo.campos.chat.label,
    ajuda: textos.modelo.campos.chat.ajuda,
    opcoes: ["economico", "balanceado", "alta_precisao"],
  },
  {
    key: "relatorio",
    label: textos.modelo.campos.report.label,
    ajuda: textos.modelo.campos.report.ajuda,
    opcoes: ["economico", "balanceado", "alta_precisao"],
  },
  {
    key: "vision",
    label: textos.modelo.campos.vision.label,
    ajuda: textos.modelo.campos.vision.ajuda,
    opcoes: ["economico", "alta_precisao"],
  },
];

/** Cor/estilo por nível — alinhado com os tokens do design system. */
function estiloNivel(nivel: NivelModelo) {
  switch (nivel) {
    case "economico":
      return {
        icone: LightningIcon,
        tile: "bg-success/15 text-success",
        ring: "data-[selected=true]:border-success/50 data-[selected=true]:bg-success/8",
        dot: "bg-success",
      };
    case "balanceado":
      return {
        icone: SparkleIcon,
        tile: "bg-info/15 text-info",
        ring: "data-[selected=true]:border-info/50 data-[selected=true]:bg-info/8",
        dot: "bg-info",
      };
    case "alta_precisao":
      return {
        icone: TrophyIcon,
        tile: "bg-primary/15 text-primary",
        ring: "data-[selected=true]:border-primary/50 data-[selected=true]:bg-primary/8",
        dot: "bg-primary",
      };
  }
}

function NivelCard({
  nivel,
  selecionado,
  onClick,
  disabled,
}: {
  nivel: NivelModelo;
  selecionado: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  const t = textos.modelo.niveis[nivel];
  const est = estiloNivel(nivel);
  const Icone = est.icone;

  return (
    // biome-ignore lint/a11y/useSemanticElements: radio card precisa de <button> estilizável, não <input>
    <button
      type="button"
      role="radio"
      aria-checked={selecionado}
      data-selected={selecionado}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "group relative flex w-full flex-col items-start gap-2.5 rounded-xl border bg-card p-3.5 text-left transition-all",
        "hover:border-foreground/25 hover:shadow-sm",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        "disabled:cursor-not-allowed disabled:opacity-50",
        est.ring,
      )}
    >
      <span className="flex w-full items-center justify-between">
        <span className={cn("flex size-8 items-center justify-center rounded-lg", est.tile)}>
          <Icone className="size-4" weight="duotone" />
        </span>
        {selecionado ? (
          <CheckCircleIcon className="size-4 text-primary" weight="fill" aria-hidden="true" />
        ) : (
          <span className={cn("size-2 rounded-full", est.dot, "opacity-30")} aria-hidden="true" />
        )}
      </span>
      <span className="flex w-full flex-col gap-0.5">
        <span className="text-sm font-medium leading-tight">{t.label}</span>
        <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {t.custo}
        </span>
      </span>
      <span className="text-xs leading-relaxed text-muted-foreground">{t.desc}</span>
      <EixosBarras nivel={nivel} />
    </button>
  );
}

function EixosBarras({ nivel }: { nivel: NivelModelo }) {
  const v = NIVEL_VELOCIDADE[nivel];
  const p = NIVEL_PRECISAO[nivel];
  return (
    <span
      className="mt-0.5 flex w-full items-center gap-2 text-[10px] text-muted-foreground"
      aria-hidden="true"
    >
      <span className="flex flex-1 items-center gap-1">
        <LightningIcon className="size-3" weight="duotone" />
        <Barras nivel={v} cor="bg-info" />
      </span>
      <span className="flex flex-1 items-center gap-1">
        <TrophyIcon className="size-3" weight="duotone" />
        <Barras nivel={p} cor="bg-primary" />
      </span>
    </span>
  );
}

function Barras({ nivel, cor }: { nivel: 1 | 2 | 3; cor: string }) {
  return (
    <span className="inline-flex items-end gap-px">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] rounded-sm",
            i === 1 && "h-1",
            i === 2 && "h-1.5",
            i === 3 && "h-2",
            i <= nivel ? cor : "bg-muted-foreground/20",
          )}
        />
      ))}
    </span>
  );
}

export function ModeloForm({ defaultChat, defaultReport, defaultVision }: Props) {
  const [chat, setChat] = useState<NivelModelo>(defaultChat);
  const [report, setReport] = useState<NivelModelo>(defaultReport);
  const [vision, setVision] = useState<NivelVision>(defaultVision);
  const [pending, startTransition] = useTransition();

  const dirty = chat !== defaultChat || report !== defaultReport || vision !== defaultVision;

  const valores: Record<Feature, NivelModelo> = { chat, relatorio: report, vision };

  function setNivel(feature: Feature, nivel: NivelModelo) {
    if (feature === "chat") setChat(nivel);
    else if (feature === "relatorio") setReport(nivel);
    else setVision(nivel as NivelVision);
  }

  function onSubmit() {
    const payload: PreferenciasIAInput = { chat, report, vision };
    startTransition(async () => {
      const res = await atualizarPreferenciasIA(payload);
      if (res.ok) toast.success("Preferências salvas.");
      else toast.error(res.erro);
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      className="flex flex-col gap-6"
    >
      {FEATURES.map((f) => {
        const grupoId = `modelo-${f.key}`;
        return (
          <div
            key={f.key}
            role="radiogroup"
            aria-labelledby={`${grupoId}-label`}
            aria-describedby={`${grupoId}-ajuda`}
            className="flex flex-col gap-2.5"
          >
            <div className="flex flex-col gap-0.5">
              <span id={`${grupoId}-label`} className="text-sm font-medium text-foreground">
                {f.label}
              </span>
              <span id={`${grupoId}-ajuda`} className="text-xs text-muted-foreground">
                {f.ajuda}
              </span>
            </div>
            <div
              className={cn(
                "grid gap-2",
                f.opcoes.length === 2 ? "grid-cols-2" : "grid-cols-1 sm:grid-cols-3",
              )}
            >
              {f.opcoes.map((nivel) => (
                <NivelCard
                  key={nivel}
                  nivel={nivel}
                  selecionado={valores[f.key] === nivel}
                  onClick={() => setNivel(f.key, nivel)}
                />
              ))}
            </div>
          </div>
        );
      })}

      <div className="flex items-center justify-end border-t pt-4">
        <Button type="submit" disabled={!dirty || pending} className="gap-1.5">
          {pending ? "Salvando..." : textos.acoes.salvar}
        </Button>
      </div>
    </form>
  );
}
