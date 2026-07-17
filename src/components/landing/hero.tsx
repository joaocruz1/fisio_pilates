import { ArrowRightIcon, MapPinIcon, ShieldCheckIcon } from "@phosphor-icons/react/dist/ssr";
import { Folha } from "@/components/landing/folha";
import { Button } from "@/components/ui/button";
import { textos } from "@/lib/textos";

const t = textos.landing.identificacao;

/**
 * Hero — o produto em ação na primeira tela.
 *
 * Duas colunas: a tese à esquerda, a folha que se assina à direita. A folha é
 * interativa (não um screenshot): a visitante pode abrir uma citação e assinar
 * o relatório sem rolar a página. É o momento memorável e é o produto.
 *
 * O fundo tem um tom sutil da marca desvanecendo para o background — dá
 * profundidade sem blobs nem grid decorativo.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-border/60">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-accent/50 via-background to-background dark:from-primary/10"
      />
      <div className="relative mx-auto grid w-full max-w-6xl gap-12 px-6 pb-16 pt-28 sm:px-8 sm:pt-36 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-10 lg:pb-24">
        <div className="flex flex-col items-start">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-primary">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary/60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
            </span>
            {t.eyebrow}
          </span>

          <h1 className="lp-normalizado mt-6 font-lp text-[clamp(2.5rem,5.6vw,4rem)] font-semibold leading-[1.02] tracking-[-0.03em]">
            {t.h1a}
            <br />
            <span className="text-brand-gradient">{t.h1b}</span>
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">{t.sub}</p>

          <div className="mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
            <Button asChild size="lg" className="group h-12 gap-2 px-6 text-base">
              <a href="/cadastro">
                {t.ctaPrimario}
                <ArrowRightIcon
                  weight="bold"
                  className="size-4 transition-transform group-hover:translate-x-0.5"
                />
              </a>
            </Button>
            <Button asChild size="lg" variant="outline" className="h-12 px-6 text-base">
              <a href="#relatorio">{t.ctaSecundario}</a>
            </Button>
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <ShieldCheckIcon weight="duotone" className="size-4.5 text-primary" />
              {t.seloTrial}
            </span>
            <span className="inline-flex items-center gap-2">
              <MapPinIcon weight="duotone" className="size-4.5 text-primary" />
              {t.seloDados}
            </span>
          </div>
        </div>

        <div className="relative lg:pl-4">
          {/* Halo sóbrio atrás da folha — luz de mesa, não blob de gradiente. */}
          <div
            aria-hidden
            className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] bg-primary/5 blur-2xl dark:bg-primary/10"
          />
          <div id="relatorio" className="scroll-mt-24">
            <Folha />
          </div>
        </div>
      </div>
    </section>
  );
}
