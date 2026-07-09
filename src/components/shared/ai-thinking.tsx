"use client";

import { SparkleIcon } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const MENSAGENS_PADRAO = [
  "Analisando o histórico do aluno…",
  "Consultando a base de conhecimento…",
  "Cruzando com a evidência…",
  "Montando a sugestão…",
];

/** Barra de "pensando" da IA: ícone pulsante + mensagens que ciclam. */
export function AiThinking({
  mensagens = MENSAGENS_PADRAO,
  className,
}: {
  mensagens?: string[];
  className?: string;
}) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % mensagens.length), 2200);
    return () => clearInterval(t);
  }, [mensagens.length]);

  return (
    <div className={cn("flex items-center gap-3 text-sm text-muted-foreground", className)}>
      <motion.span
        className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-gradient text-primary-foreground shadow-sm shadow-primary/30"
        animate={{ scale: [1, 1.12, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 1.4, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      >
        <SparkleIcon className="size-4" weight="fill" />
      </motion.span>
      <div className="relative h-5 flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.span
            key={i}
            className="absolute inset-0 flex items-center"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3 }}
          >
            {mensagens[i]}
          </motion.span>
        </AnimatePresence>
      </div>
    </div>
  );
}

/** Linha de shimmer (skeleton) para simular conteúdo carregando. */
export function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-md bg-muted", className)}>
      <motion.div
        className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-background/60 to-transparent"
        animate={{ x: ["-100%", "200%"] }}
        transition={{ duration: 1.3, repeat: Number.POSITIVE_INFINITY, ease: "easeInOut" }}
      />
    </div>
  );
}

/** Skeleton de um card de plano/relatório gerado pela IA (durante a espera). */
export function AiCardSkeleton({ mensagens }: { mensagens?: string[] }) {
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-primary/20 bg-card p-4 shadow-sm">
      <AiThinking mensagens={mensagens} />
      <Shimmer className="h-5 w-2/3" />
      <div className="flex flex-col gap-2">
        <Shimmer className="h-16 w-full" />
        <Shimmer className="h-16 w-full" />
        <Shimmer className="h-16 w-full" />
      </div>
    </div>
  );
}
