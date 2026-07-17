"use client";

import { ListIcon, XIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useEffect, useState } from "react";
import { LogoMarca } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { textos } from "@/lib/textos";
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: "#relatorio", label: textos.landing.nav.relatorio },
  { href: "#avaliacao", label: textos.landing.nav.avaliacao },
  { href: "#planos", label: textos.landing.nav.planos },
  { href: "#faq", label: textos.landing.nav.faq },
];

export function NavPublic() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fecha o menu mobile ao trocar de hash
  useEffect(() => {
    const close = () => setOpen(false);
    window.addEventListener("hashchange", close);
    return () => window.removeEventListener("hashchange", close);
  }, []);

  return (
    // Transparente sobre o hero; ao rolar, ganha vidro fosco e uma borda sutil.
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-colors duration-200",
        scrolled
          ? "border-b border-border/60 bg-background/80 backdrop-blur-md"
          : "border-b border-transparent bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-6 sm:px-8">
        <Link
          href="/"
          aria-label={textos.app.nome}
          className="-ml-px rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        >
          <LogoMarca tamanho={30} prioridade />
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Navegação principal">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="relative text-sm text-muted-foreground transition-colors after:absolute after:inset-x-0 after:-bottom-1.5 after:h-px after:origin-left after:scale-x-0 after:bg-primary after:transition-transform after:duration-200 hover:text-foreground hover:after:scale-x-100 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring motion-reduce:after:transition-none"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {/* Sem persistir: visitante anônimo não tem conta para salvar. A action
              chamaria requireTenant() e redirecionaria. */}
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">{textos.landing.nav.entrar}</Link>
          </Button>
          <Button asChild size="sm" className="h-9 px-4">
            <Link href="/cadastro">{textos.landing.nav.criarConta}</Link>
          </Button>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex size-11 items-center justify-center rounded-md text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            aria-label={open ? textos.landing.nav.fecharMenu : textos.landing.nav.abrirMenu}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? <XIcon className="size-5" /> : <ListIcon className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-nav" className="border-t border-border/60 bg-background md:hidden">
          <nav
            className="mx-auto flex w-full max-w-6xl flex-col gap-0.5 px-4 py-2 sm:px-6"
            aria-label="Navegação mobile"
          >
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3 text-sm text-foreground/80 transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-lp-fio px-3 pb-2 pt-3">
              <Button asChild variant="outline" className="h-11">
                <Link href="/login">{textos.landing.nav.entrar}</Link>
              </Button>
              <Button asChild className="h-11">
                <Link href="/cadastro">{textos.landing.nav.criarConta}</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
