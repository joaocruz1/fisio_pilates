"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

const PAD = 6;

/**
 * Fundo escurecido com um "recorte" (spotlight) ao redor do alvo. O recorte é
 * feito com um box-shadow gigante — tudo fora do retângulo fica escuro. z-40
 * (abaixo dos dialogs z-50, acima do header z-20).
 */
export function TourOverlay({ rect }: { rect: DOMRect | null }) {
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);
  if (!montado) return null;

  const conteudo = rect ? (
    <motion.div
      aria-hidden
      className="pointer-events-none fixed z-40 rounded-xl ring-2 ring-primary/70"
      initial={false}
      animate={{
        top: rect.top - PAD,
        left: rect.left - PAD,
        width: rect.width + PAD * 2,
        height: rect.height + PAD * 2,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 32 }}
      style={{ boxShadow: "0 0 0 9999px rgba(2, 6, 23, 0.62)" }}
    />
  ) : (
    <div aria-hidden className="fixed inset-0 z-40 bg-[rgba(2,6,23,0.62)]" />
  );

  return createPortal(
    <>
      {/* bloqueia interação com a página por trás; não fecha por clique */}
      <div aria-hidden className="fixed inset-0 z-40" />
      {conteudo}
    </>,
    document.body,
  );
}
