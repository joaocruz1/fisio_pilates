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
  { href: "#recursos", label: textos.landing.nav.recursos },
  { href: "#como-funciona", label: textos.landing.nav.comoFunciona },
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
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 transition-all duration-300",
        scrolled
          ? "border-b border-border/60 bg-background/85 backdrop-blur-md shadow-sm shadow-foreground/5"
          : "bg-transparent",
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1400px] items-center justify-between px-6 sm:px-10 lg:px-16">
        <Link href="/" aria-label={textos.app.nome}>
          <LogoMarca tamanho={32} prioridade />
        </Link>

        <nav className="hidden items-center gap-7 md:flex" aria-label="Navegação principal">
          {NAV_LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {/* Sem persistir: visitante anônimo não tem conta para salvar. */}
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">{textos.landing.nav.entrar}</Link>
          </Button>
          <Button asChild size="sm" className="rounded-full px-5">
            <Link href="/cadastro">{textos.landing.nav.comecarGratis}</Link>
          </Button>
        </div>

        <div className="flex items-center gap-1 md:hidden">
          <ThemeToggle />
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="inline-flex size-10 items-center justify-center rounded-lg text-foreground"
            aria-label={open ? textos.landing.nav.fecharMenu : textos.landing.nav.abrirMenu}
            aria-expanded={open}
            aria-controls="mobile-nav"
          >
            {open ? <XIcon className="size-5" /> : <ListIcon className="size-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div
          id="mobile-nav"
          className="border-t border-border/60 bg-background/95 backdrop-blur md:hidden"
        >
          <nav
            className="mx-auto flex max-w-[1400px] flex-col gap-1 px-6 py-3"
            aria-label="Navegação mobile"
          >
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="rounded-lg px-3 py-2 text-sm text-foreground/80 transition-colors hover:bg-muted"
              >
                {l.label}
              </a>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border/60 pt-3">
              <Button asChild variant="outline" size="sm">
                <Link href="/login">{textos.landing.nav.entrar}</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full">
                <Link href="/cadastro">{textos.landing.nav.comecarGratis}</Link>
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
