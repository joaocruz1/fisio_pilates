"use client";

import { LightningIcon, SparkleIcon, TrophyIcon } from "@phosphor-icons/react";
import {
  catalogoParaUi,
  NIVEL_PRECISAO,
  NIVEL_VELOCIDADE,
  type NivelModelo,
} from "@/lib/ai/modelos";
import { textos } from "@/lib/textos";
import { cn } from "@/lib/utils";

type Props = {
  /** Slug OpenRouter atual (override da conversa). null = usa preferência. */
  value: string | null;
  onChange: (slug: string | null) => void;
};

const catalogo = catalogoParaUi();

const ICONE: Record<NivelModelo, typeof SparkleIcon> = {
  economico: LightningIcon,
  balanceado: SparkleIcon,
  alta_precisao: TrophyIcon,
};

/**
 * Seletor inline de qualidade da IA pro header do chat. Mostra 3 ícones
 * (rápido · padrão · preciso) + um botão "Padrão" que volta à preferência.
 *
 * Visual minimalista (segmented control), segue o padrão do
 * `Alternador` em /agenda. Cada opção mostra só o ícone + label curto,
 * sem custo — o tooltip dá o detalhe de velocidade/precisão.
 */
export function ModeloPicker({ value, onChange }: Props) {
  return (
    <div
      role="radiogroup"
      aria-label={textos.modelo.titulo}
      data-tour="assistente-modelo"
      className="inline-flex items-center gap-1 rounded-full border bg-muted/30 p-0.5"
    >
      {/* biome-ignore lint/a11y/useSemanticElements: radio segmentado precisa de <button> estilizável */}
      <button
        type="button"
        role="radio"
        aria-checked={value === null}
        title={textos.modelo.picker.hint}
        onClick={() => onChange(null)}
        className={cn(
          "rounded-full px-2.5 py-1 text-xs font-medium transition-colors",
          value === null
            ? "bg-background text-foreground shadow-sm"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        {textos.modelo.picker.placeholder}
      </button>
      {catalogo.chat.map((opt) => {
        const Icone = ICONE[opt.nivel];
        const ativo = value === opt.slug;
        const t = textos.modelo.niveis[opt.nivel];
        const v = NIVEL_VELOCIDADE[opt.nivel];
        const p = NIVEL_PRECISAO[opt.nivel];
        const title = `${t.label} — velocidade ${v}/3 · precisão ${p}/3 · ${t.custo}`;
        return (
          // biome-ignore lint/a11y/useSemanticElements: radio segmentado precisa de <button> estilizável
          <button
            key={opt.nivel}
            type="button"
            role="radio"
            aria-checked={ativo}
            title={title}
            onClick={() => onChange(opt.slug)}
            className={cn(
              "flex size-7 items-center justify-center rounded-full transition-colors",
              ativo
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:bg-background hover:text-foreground",
            )}
          >
            <Icone className="size-3.5" weight="duotone" />
          </button>
        );
      })}
    </div>
  );
}
