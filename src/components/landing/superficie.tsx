"use client";

import { MotionConfig } from "framer-motion";

/**
 * A superfície da landing.
 *
 * Só existe para plantar um `MotionConfig reducedMotion="user"` sobre a árvore:
 * quem pediu menos movimento no sistema operacional recebe a página parada, sem
 * cada componente ter que lembrar de perguntar.
 *
 * Não cobre tudo sozinho — `reducedMotion="user"` neutraliza transform e layout,
 * mas não `height` nem transições de CSS. Onde isso importa, o gate é explícito
 * (ver `Fonte` em folha.tsx e o `motion-reduce:` das transições de cor).
 */
export function Superficie({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
