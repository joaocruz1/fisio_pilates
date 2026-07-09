"use client";

import { CheckCircleIcon, CircleIcon, SparkleIcon, SpinnerIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";

export type EstadoAula = {
  stage: "dados" | "base" | "gerando";
  foco: string;
  exercicios: string[];
};

const ETAPAS = [
  { key: "dados", label: "Reunindo o histórico do aluno", desc: "Sessões, condições e medidas" },
  {
    key: "base",
    label: "Consultando a base de conhecimento",
    desc: "Evidência e cuidados por condição",
  },
  {
    key: "gerando",
    label: "Montando o plano de aula",
    desc: "Selecionando exercícios do catálogo",
  },
] as const;

const ORDEM = ["dados", "base", "gerando"] as const;

/**
 * Progresso REAL da geração de aula. Reflete o pipeline de fato (dados → base →
 * geração) e, na última etapa, mostra o foco e os exercícios aparecendo conforme
 * a IA os escreve (streaming).
 */
export function ProgressoAula({ estado }: { estado: EstadoAula }) {
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
          <p className="font-heading text-sm font-semibold">Gerando o plano da próxima aula</p>
          <p className="text-xs text-muted-foreground">Acompanhe o que a IA está fazendo</p>
        </div>
      </div>

      <ul className="flex flex-col gap-1">
        {ETAPAS.map((etapa, i) => {
          const done = i < atual;
          const active = i === atual;
          return (
            <li key={etapa.key} className="flex items-start gap-2.5 rounded-lg px-1 py-1.5">
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
                {active ? <p className="text-xs text-muted-foreground">{etapa.desc}</p> : null}

                {/* Última etapa: mostra o plano sendo escrito ao vivo. */}
                {etapa.key === "gerando" && active ? (
                  <div className="mt-2 flex flex-col gap-2">
                    {estado.foco ? (
                      <p className="text-sm">
                        <span className="font-medium text-foreground/80">Foco:</span>{" "}
                        <span className="text-muted-foreground">{estado.foco}</span>
                      </p>
                    ) : null}
                    <div className="flex flex-wrap gap-1.5">
                      <AnimatePresence>
                        {estado.exercicios.map((nome) => (
                          <motion.span
                            key={nome}
                            initial={{ opacity: 0, scale: 0.9, y: 4 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary"
                          >
                            {nome}
                          </motion.span>
                        ))}
                      </AnimatePresence>
                      {estado.exercicios.length === 0 ? (
                        <span className="text-xs text-muted-foreground">
                          Escolhendo exercícios…
                        </span>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
