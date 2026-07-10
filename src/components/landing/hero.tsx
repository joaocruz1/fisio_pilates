"use client";

import { ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr";
import { motion, useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { textos } from "@/lib/textos";

const SceneHero3D = dynamic(
  () => import("@/components/landing/scene-hero-3d-wrapper").then((m) => m.SceneHero3D),
  { ssr: false, loading: () => <Hero3DPlaceholder /> },
);

function Hero3DPlaceholder() {
  return (
    <div className="relative aspect-square w-full overflow-hidden rounded-3xl border border-border/60 bg-card">
      <div
        className="pointer-events-none absolute -top-12 -right-12 size-48 rounded-full bg-primary/20 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-12 -left-12 size-56 rounded-full bg-accent/30 blur-3xl"
        aria-hidden
      />
    </div>
  );
}

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

        {/* Cena 3D */}
        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.96 }}
          animate={reduced ? undefined : { opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.1, ease: "easeOut" }}
          className="relative"
        >
          <SceneHero3D />
        </motion.div>
      </div>
    </section>
  );
}
