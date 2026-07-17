"use client";

import {
  CheckCircleIcon,
  ShieldCheckIcon,
  SparkleIcon,
  TrendUpIcon,
} from "@phosphor-icons/react/dist/ssr";
import { motion, useReducedMotion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { textos } from "@/lib/textos";

export function Hero() {
  const reduced = useReducedMotion();

  return (
    <section className="relative overflow-hidden pt-28 pb-20 sm:pt-32 sm:pb-28">
      {/* Decoração de fundo */}
      <div
        className="pointer-events-none absolute -top-24 right-0 size-[28rem] rounded-full bg-primary/10 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-32 left-0 size-[32rem] rounded-full bg-accent/30 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        aria-hidden
        style={{
          backgroundImage:
            "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(closest-side, black, transparent 80%)",
        }}
      />

      <div className="relative mx-auto grid max-w-[1400px] gap-12 px-6 sm:px-10 lg:grid-cols-2 lg:items-center lg:gap-16 lg:px-16">
        {/* Copy */}
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 12 }}
          animate={reduced ? undefined : { opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="flex flex-col items-start gap-6"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium uppercase tracking-wider text-primary">
            <span className="size-1.5 rounded-full bg-primary" />
            {textos.landing.hero.eyebrow}
          </span>

          <h1 className="font-heading text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl">
            <span className="text-brand-gradient">{textos.landing.hero.h1.split(",")[0]},</span>{" "}
            <span className="text-foreground">
              {textos.landing.hero.h1.split(",").slice(1).join(",").trim()}
            </span>
          </h1>

          <p className="max-w-xl text-base text-muted-foreground sm:text-lg">
            {textos.landing.hero.sub}
          </p>

          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <Button
              asChild
              size="lg"
              className="rounded-full px-7 text-base shadow-lg shadow-primary/20"
            >
              <Link href="/cadastro">{textos.landing.hero.ctaPrimario}</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="rounded-full px-7 text-base">
              <a href="#planos">{textos.landing.hero.ctaSecundario}</a>
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheckIcon weight="fill" className="size-4 text-success" />
              {textos.landing.hero.seloTrial}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-block size-2 rounded-full bg-success" />
              {textos.landing.hero.seloBrasil}
            </span>
          </div>
        </motion.div>

        {/* Composição da marca */}
        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.97 }}
          animate={reduced ? undefined : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          className="relative"
        >
          <HeroVisual reduced={!!reduced} />
        </motion.div>
      </div>
    </section>
  );
}

/**
 * Visual do hero: painel com a curva fluida do símbolo da logo em gradiente,
 * um preview do produto (sessão registrada na maca) e chips flutuantes.
 */
function HeroVisual({ reduced }: { reduced: boolean }) {
  return (
    <div className="relative mx-auto aspect-[10/9] w-full max-w-[560px]">
      {/* Painel de fundo */}
      <div className="absolute inset-0 overflow-hidden rounded-[2.5rem] border border-border/60 bg-soft-gradient shadow-xl shadow-primary/10">
        {/* Curva da marca — eco do símbolo da logo */}
        <svg
          viewBox="0 0 560 504"
          className="absolute inset-0 h-full w-full"
          aria-hidden="true"
          role="presentation"
          fill="none"
        >
          <defs>
            <linearGradient id="hero-swoosh" x1="0" y1="504" x2="560" y2="0">
              <stop offset="0" stopColor="oklch(0.61 0.155 245.5)" />
              <stop offset="1" stopColor="oklch(0.427 0.125 251)" />
            </linearGradient>
          </defs>
          {/* Asa: grossa e arredondada à esquerda, afinando até a ponta
              superior direita — a mesma silhueta do símbolo da marca. */}
          <path
            d="M60 392 C 26 330, 58 254, 138 244 C 226 233, 304 206, 396 142 C 450 104, 500 68, 546 34
               C 508 100, 456 172, 386 240 C 300 324, 196 428, 120 440 C 84 446, 70 424, 60 392 Z"
            fill="url(#hero-swoosh)"
            opacity="0.16"
          />
        </svg>
      </div>

      {/* Ícone da marca */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: -8 }}
        animate={reduced ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.35 }}
        className="absolute right-8 top-8"
      >
        <Image
          src="/brand/icon-tile-dark.png"
          alt=""
          width={64}
          height={64}
          priority
          className="block size-14 drop-shadow-lg sm:size-16 dark:hidden"
        />
        <Image
          src="/brand/icon-tile-light.png"
          alt=""
          width={64}
          height={64}
          priority
          className="hidden size-14 drop-shadow-lg sm:size-16 dark:block"
        />
      </motion.div>

      {/* Preview do produto: sessão registrada na maca */}
      <motion.div
        initial={reduced ? false : { opacity: 0, y: 16 }}
        animate={reduced ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.25 }}
        className="absolute inset-x-6 bottom-6 top-auto rounded-2xl border border-border/60 bg-card/95 shadow-2xl shadow-primary/15 backdrop-blur sm:inset-x-10 sm:bottom-10"
      >
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-2.5">
          <span className="text-xs font-medium text-foreground">Sessão de hoje · Aluna M.S.</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
            Reformer
          </span>
        </div>
        <div className="space-y-1.5 p-3">
          {[
            { ex: "Footwork · 1ª série", detalhe: "2 molas vermelhas · 10 reps", eva: "3 → 1" },
            { ex: "Hundred", detalhe: "1 mola vermelha · 100 reps", eva: "2 → 0" },
            { ex: "Spine Stretch Forward", detalhe: "sem molas · 6 reps", eva: "0 → 0" },
          ].map((row) => (
            <div
              key={row.ex}
              className="flex items-center justify-between gap-2 rounded-lg border border-border/50 bg-background/70 px-3 py-1.5 text-xs"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-foreground">{row.ex}</div>
                <div className="truncate text-[10px] text-muted-foreground">{row.detalhe}</div>
              </div>
              <span className="shrink-0 rounded-md bg-success/10 px-1.5 py-0.5 font-mono text-[10px] font-medium text-success">
                EVA {row.eva}
              </span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Chips flutuantes */}
      <motion.div
        initial={reduced ? false : { opacity: 0, x: -10 }}
        animate={reduced ? undefined : { opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="absolute left-4 top-10 flex items-center gap-2 rounded-full border border-border/60 bg-card/95 px-3 py-1.5 text-xs font-medium shadow-lg shadow-primary/10 backdrop-blur sm:left-6 sm:top-14"
      >
        <SparkleIcon weight="fill" className="size-3.5 text-primary" />
        Relatório com fontes citadas
      </motion.div>

      <motion.div
        initial={reduced ? false : { opacity: 0, x: 10 }}
        animate={reduced ? undefined : { opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.65 }}
        className="absolute right-4 top-[38%] flex items-center gap-2 rounded-full border border-border/60 bg-card/95 px-3 py-1.5 text-xs font-medium shadow-lg shadow-primary/10 backdrop-blur sm:right-8"
      >
        <TrendUpIcon weight="bold" className="size-3.5 text-success" />
        EVA lombar 6 → 2
      </motion.div>

      <motion.div
        initial={reduced ? false : { opacity: 0, y: 10 }}
        animate={reduced ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.8 }}
        className="absolute left-6 top-[30%] hidden items-center gap-2 rounded-full border border-border/60 bg-card/95 px-3 py-1.5 text-xs font-medium shadow-lg shadow-primary/10 backdrop-blur sm:flex"
      >
        <CheckCircleIcon weight="fill" className="size-3.5 text-success" />
        Você aprova antes de enviar
      </motion.div>
    </div>
  );
}
