import { ArrowRightIcon, ChatCircleDotsIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { textos } from "@/lib/textos";

export function FinalCTA() {
  return (
    <section className="bg-background py-20 sm:py-28">
      <div className="mx-auto max-w-[1400px] px-6 sm:px-10 lg:px-16">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl bg-brand-gradient p-8 text-primary-foreground shadow-2xl shadow-primary/20 sm:p-12 lg:p-16">
            {/* Decoração de fundo */}
            <div
              className="pointer-events-none absolute -top-20 -right-20 size-72 rounded-full bg-white/10 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute -bottom-24 -left-12 size-80 rounded-full bg-white/5 blur-3xl"
              aria-hidden
            />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.08]"
              aria-hidden
              style={{
                backgroundImage:
                  "linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)",
                backgroundSize: "40px 40px",
                maskImage: "radial-gradient(closest-side, black, transparent 80%)",
              }}
            />
            {/* Curva da marca — eco do símbolo da logo */}
            <svg
              viewBox="0 0 1200 400"
              className="pointer-events-none absolute inset-0 h-full w-full"
              aria-hidden="true"
              role="presentation"
              fill="none"
              preserveAspectRatio="none"
            >
              <path
                d="M-40 360 C 260 420, 520 300, 720 210 C 900 130, 1040 80, 1260 -20"
                stroke="white"
                strokeWidth="90"
                strokeLinecap="round"
                opacity="0.06"
              />
            </svg>

            <div className="relative flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl">
                <h2 className="font-heading text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                  {textos.landing.finalCta.titulo}
                </h2>
                <p className="mt-4 text-base text-primary-foreground/85 sm:text-lg">
                  {textos.landing.finalCta.sub}
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Button
                  asChild
                  size="lg"
                  variant="secondary"
                  className="rounded-full px-7 text-base shadow-md"
                >
                  <Link href="/cadastro">
                    {textos.landing.finalCta.ctaPrimario}
                    <ArrowRightIcon className="ml-1.5 size-4" weight="bold" />
                  </Link>
                </Button>
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="rounded-full border-white/30 bg-white/5 px-7 text-base text-primary-foreground hover:bg-white/15 hover:text-primary-foreground"
                >
                  <a href="mailto:contato@fisiopilates.com.br">
                    <ChatCircleDotsIcon className="mr-1.5 size-4" weight="bold" />
                    {textos.landing.finalCta.ctaSecundario}
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
