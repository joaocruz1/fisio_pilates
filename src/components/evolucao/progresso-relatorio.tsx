"use client";

import { CheckCircleIcon, CircleIcon, SparkleIcon, SpinnerIcon } from "@phosphor-icons/react";
import { motion } from "framer-motion";

export type EstadoRelatorio = { stage: "dados" | "base" | "gerando"; resumo: string };

const ETAPAS = [
  { key: "dados", label: "Reunindo aulas, medidas e condições" },
  { key: "base", label: "Consultando a base de conhecimento" },
  { key: "gerando", label: "Redigindo o relatório de evolução" },
] as const;

const ORDEM = ["dados", "base", "gerando"] as const;

/** Progresso REAL da geração do relatório (etapas + resumo aparecendo ao vivo). */
export function ProgressoRelatorio({ estado }: { estado: EstadoRelatorio }) {
  const atual = ORDEM.indexOf(estado.stage);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-card p-5 shadow-lg">
      <div className="flex items-center gap-2.5">
        <motion.span
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-primary-foreground shadow-sm shadow-primary/30"
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
        >
          <SparkleIcon className="size-4" weight="fill" />
        </motion.span>
        <div>
          <p className="font-heading text-sm font-semibold">Gerando o relatório de evolução</p>
          <p className="text-xs text-muted-foreground">Acompanhe o que a IA está fazendo</p>
        </div>
      </div>

      <ul className="flex flex-col gap-1">
        {ETAPAS.map((etapa, i) => {
          const done = i < atual;
          const active = i === atual;
          return (
            <li key={etapa.key} className="flex items-start gap-2.5 px-1 py-1.5">
              <span className="mt-0.5">
                {done ? (
                  <CheckCircleIcon className="size-5 text-success" weight="fill" />
                ) : active ? (
                  <SpinnerIcon className="size-5 animate-spin text-primary" />
                ) : (
                  <CircleIcon className="size-5 text-muted-foreground/30" />
                )}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className={
                    done
                      ? "text-sm text-muted-foreground line-through decoration-muted-foreground/40"
                      : active
                        ? "text-sm font-medium text-foreground"
                        : "text-sm text-muted-foreground/60"
                  }
                >
                  {etapa.label}
                </p>
                {etapa.key === "gerando" && active && estado.resumo ? (
                  <p className="mt-1 line-clamp-4 text-sm text-muted-foreground">{estado.resumo}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
