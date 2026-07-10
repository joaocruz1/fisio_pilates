"use client";

import { Canvas } from "@react-three/fiber";
import { useEffect, useState } from "react";
import { SceneFallback } from "@/components/landing/scene-fallback";
import { cn } from "@/lib/utils";
import { Scene } from "./scene-hero-3d";

/**
 * Wrapper da cena 3D do hero.
 *
 * - Em SSR / primeiro paint: renderiza o fallback (sem flicker, sem JS).
 * - No cliente, decide entre Canvas R3F ou Fallback:
 *    - prefers-reduced-motion: reduce        → Fallback
 *    - navigator.deviceMemory < 4           → Fallback
 *    - Caso contrário                        → Canvas com Scene
 *
 * O Canvas é renderizado em `position: absolute` dentro de um container com
 * `aspect-ratio: 1` para evitar CLS. Carrega via dynamic no page.tsx com
 * `ssr: false` para garantir que isso nunca rode no servidor.
 */
export function SceneHero3D({ className }: { className?: string }) {
  const [mode, setMode] = useState<"fallback" | "canvas">("fallback");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? 8;
    if (reduced || mem < 4) {
      setMode("fallback");
    } else {
      setMode("canvas");
    }
  }, []);

  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded-3xl border border-border/60 bg-card",
        className,
      )}
    >
      {/* Glow decorativo sempre presente (funciona bem em qualquer modo) */}
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background: "radial-gradient(closest-side, oklch(0.66 0.13 205 / 0.18), transparent 70%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -top-12 -right-12 size-48 rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-12 size-56 rounded-full bg-accent/30 blur-3xl"
        aria-hidden
      />

      {!mounted || mode === "fallback" ? (
        <SceneFallback className="border-0" />
      ) : (
        <Canvas
          dpr={[1, 1.5]}
          camera={{ position: [0, 0, 5.5], fov: 45 }}
          gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
          className="!absolute !inset-0"
        >
          <Scene prefersReducedMotion={false} />
        </Canvas>
      )}

      {/* Texto auxiliar de SEO/acessibilidade (invisível) */}
      <span className="sr-only">
        Cena 3D interativa representando a evolução clínica de uma aluna de Pilates, com partículas
        orbitais e anel de nós representando o fluxo entre sessão, base de conhecimento e relatório
        com IA.
      </span>
    </div>
  );
}
