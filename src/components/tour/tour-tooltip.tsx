"use client";

import { ArrowLeftIcon, ArrowRightIcon, SparkleIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import type { TourStep } from "@/lib/tour-steps";

const W = 340; // largura do cartão
const GAP = 14; // distância do alvo

/** Calcula a posição do cartão relativo ao alvo, com fallback central. */
function posicionar(
  rect: DOMRect | null,
  placement: TourStep["placement"],
): { top: number; left: number; centralizado: boolean } {
  if (typeof window === "undefined") return { top: 0, left: 0, centralizado: true };
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const cardH = 210;

  if (!rect || vw < 640) {
    // Mobile ou sem alvo: centro inferior.
    return { top: vh - cardH - 24, left: Math.max(16, (vw - W) / 2), centralizado: true };
  }

  let top = rect.bottom + GAP;
  let left = rect.left + rect.width / 2 - W / 2;

  if (placement === "top") top = rect.top - cardH - GAP;
  else if (placement === "left") {
    top = rect.top;
    left = rect.left - W - GAP;
  } else if (placement === "right") {
    top = rect.top;
    left = rect.right + GAP;
  } else if (placement === "center") {
    return { top: vh / 2 - cardH / 2, left: (vw - W) / 2, centralizado: true };
  }

  // Mantém dentro da viewport.
  left = Math.min(Math.max(16, left), vw - W - 16);
  top = Math.min(Math.max(16, top), vh - cardH - 16);
  return { top, left, centralizado: false };
}

export function TourTooltip({
  step,
  rect,
  index,
  total,
  onPrev,
  onNext,
  onSkip,
}: {
  step: TourStep;
  rect: DOMRect | null;
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  onSkip: () => void;
}) {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  if (!montado) return null;

  const pos = posicionar(rect, step.placement);
  const ultimo = index === total - 1;
  const primeiro = index === 0;
  const progresso = Math.round(((index + 1) / total) * 100);

  return createPortal(
    <AnimatePresence mode="wait">
      <motion.div
        key={step.id}
        className="fixed z-50 w-[340px] max-w-[calc(100vw-2rem)] rounded-2xl border border-primary/20 bg-card p-4 shadow-2xl"
        style={{ top: pos.top, left: pos.left }}
        initial={{ opacity: 0, scale: 0.96, y: 6 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.18 }}
      >
        <div className="mb-2 flex items-center gap-2">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-brand-gradient text-primary-foreground">
            <SparkleIcon className="size-4" weight="fill" />
          </span>
          <p className="font-heading text-sm font-semibold">{step.title}</p>
        </div>

        <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>

        {/* Progresso */}
        <div className="mt-3 h-1 w-full overflow-hidden rounded-full bg-muted">
          <motion.div
            className="h-full rounded-full bg-brand-gradient"
            initial={false}
            animate={{ width: `${progresso}%` }}
            transition={{ type: "spring", stiffness: 200, damping: 30 }}
          />
        </div>

        <div className="mt-3 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Pular tour
          </button>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {index + 1} / {total}
            </span>
            {!primeiro ? (
              <Button size="sm" variant="outline" onClick={onPrev}>
                <ArrowLeftIcon className="size-4" />
              </Button>
            ) : null}
            <Button size="sm" onClick={onNext}>
              {ultimo ? "Concluir 🎉" : "Próximo"}
              {!ultimo ? <ArrowRightIcon className="size-4" /> : null}
            </Button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body,
  );
}
