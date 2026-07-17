import { ArrowRightIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { LogoMarca } from "@/components/brand/logo";
import { Reveal } from "@/components/motion";
import { Button } from "@/components/ui/button";
import { textos } from "@/lib/textos";

const t = textos.landing.footer;

/**
 * Fecho + rodapé.
 *
 * O fecho é uma faixa na cor da marca — a única superfície da landing onde o
 * azul fala alto, no ponto de decisão. Absorve o antigo FinalCTA (que era um
 * clone do hero) e mantém a honestidade que substituiu os depoimentos falsos.
 *
 * O rodapé lista só o que existe: sem Instagram/LinkedIn/GitHub apontando para
 * a raiz de cada site, sem seis links institucionais todos indo para
 * /privacidade. Um link falso destrói mais confiança do que quatro colunas
 * constroem — e confiança é o produto.
 */
export function SiteFooter() {
  return (
    <footer>
      {/* Fecho colorido */}
      <div className="relative overflow-hidden bg-brand-gradient text-primary-foreground">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)",
            backgroundSize: "28px 28px",
          }}
        />
        <Reveal className="relative mx-auto w-full max-w-4xl px-6 py-20 text-center sm:px-8 sm:py-28">
          <h2 className="mx-auto max-w-[18ch] text-balance font-lp text-3xl font-semibold leading-[1.1] tracking-[-0.02em] sm:text-4xl lg:text-[2.75rem]">
            {textos.landing.fecho.h2}
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-pretty text-primary-foreground/85">
            {textos.landing.fecho.honestidade}
          </p>
          <Button
            asChild
            size="lg"
            className="group mt-8 h-12 gap-2 bg-primary-foreground px-7 text-base text-primary hover:bg-primary-foreground/90"
          >
            <Link href="/cadastro">
              {textos.landing.identificacao.ctaPrimario}
              <ArrowRightIcon
                weight="bold"
                className="size-4 transition-transform group-hover:translate-x-0.5"
              />
            </Link>
          </Button>
        </Reveal>
      </div>

      {/* Rodapé */}
      <div className="border-t border-border/60 bg-background">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-6 py-12 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <Link
              href="/"
              aria-label={textos.app.nome}
              className="inline-block rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            >
              <LogoMarca tamanho={28} />
            </Link>
            <p className="mt-3 text-xs text-muted-foreground">{t.feito}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              {t.copyright(new Date().getFullYear())}
            </p>
          </div>

          <nav className="flex flex-wrap gap-x-8 gap-y-3 text-sm" aria-label="Rodapé">
            <a
              href="#relatorio"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {t.links.relatorio}
            </a>
            <a
              href="#avaliacao"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {t.links.avaliacao}
            </a>
            <a
              href="#planos"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {t.links.planos}
            </a>
            <a
              href="#faq"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {t.links.perguntas}
            </a>
            <Link
              href="/privacidade"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              {t.links.privacidade}
            </Link>
          </nav>
        </div>
      </div>
    </footer>
  );
}
