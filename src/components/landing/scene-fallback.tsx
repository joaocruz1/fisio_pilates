"use client";

import { cn } from "@/lib/utils";

/**
 * Fallback visual da cena 3D do hero. Usado quando o usuário tem
 * `prefers-reduced-motion: reduce` ou o dispositivo tem pouca RAM/RGB
 * (Canvas WebGL evitado para preservar bateria e evitar travamentos).
 *
 * Mantém a mesma silhueta visual: gradiente conic girando devagar + 3 orbs
 * desfocados + grid sutil. Nenhuma animação pesada.
 */
export function SceneFallback({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative isolate flex aspect-square w-full items-center justify-center overflow-hidden rounded-3xl",
        "border border-border/60 bg-card",
        className,
      )}
      aria-hidden
    >
      {/* Grid sutil de fundo */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Gradiente cônico central girando bem devagar */}
      <div
        className="absolute size-[140%] animate-[spin_60s_linear_infinite] opacity-70 motion-reduce:animate-none"
        style={{
          background:
            "conic-gradient(from 180deg at 50% 50%, oklch(0.55 0.15 255) 0deg, oklch(0.66 0.13 205) 120deg, oklch(0.62 0.13 158) 240deg, oklch(0.55 0.15 255) 360deg)",
          filter: "blur(60px)",
        }}
      />

      {/* Núcleo "halo" central */}
      <div className="absolute size-2/3 rounded-full bg-soft-gradient opacity-50 blur-2xl" />

      {/* Orbs decorativos */}
      <span className="absolute top-[18%] right-[20%] size-20 rounded-full bg-primary/30 blur-2xl" />
      <span className="absolute bottom-[20%] left-[18%] size-24 rounded-full bg-accent/40 blur-3xl" />
      <span className="absolute top-1/2 left-1/2 size-32 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-3xl" />

      {/* Anel estático no centro (substitui o icosahedron) */}
      <div className="relative size-44 rounded-full border-2 border-primary/30 shadow-[0_0_60px_-10px] shadow-primary/30 sm:size-56" />
    </div>
  );
}
