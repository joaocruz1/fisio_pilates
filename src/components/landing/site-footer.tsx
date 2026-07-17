import {
  GithubLogoIcon,
  InstagramLogoIcon,
  LinkedinLogoIcon,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { LogoMarca } from "@/components/brand/logo";
import { textos } from "@/lib/textos";

const COLUNAS = [
  {
    titulo: textos.landing.footer.produto,
    links: [
      { href: "#recursos", label: textos.landing.footer.links.recursos },
      { href: "#planos", label: textos.landing.footer.links.planos },
      { href: "#como-funciona", label: textos.landing.footer.links.comoFunciona },
      { href: "#faq", label: textos.landing.footer.links.perguntas },
    ],
  },
  {
    titulo: textos.landing.footer.empresa,
    links: [
      { href: "/privacidade", label: textos.landing.footer.links.sobre },
      { href: "/privacidade", label: textos.landing.footer.links.contato },
      { href: "/privacidade", label: textos.landing.footer.links.status },
    ],
  },
  {
    titulo: textos.landing.footer.legal,
    links: [
      { href: "/privacidade", label: textos.landing.footer.links.privacidade },
      { href: "/privacidade", label: textos.landing.footer.links.termos },
      { href: "/privacidade", label: textos.landing.footer.links.lgpd },
      { href: "/privacidade", label: textos.landing.footer.links.cookies },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-background">
      <div className="mx-auto max-w-[1400px] px-6 py-12 sm:px-10 sm:py-16 lg:px-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          {/* Coluna de marca */}
          <div className="lg:col-span-2">
            <Link href="/" aria-label={textos.app.nome}>
              <LogoMarca tamanho={32} />
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">{textos.app.tagline}</p>
            <div className="mt-5 flex items-center gap-3 text-muted-foreground">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-md p-2 transition-colors hover:bg-muted hover:text-foreground"
                aria-label="Instagram"
              >
                <InstagramLogoIcon className="size-4" weight="bold" />
              </a>
              <a
                href="https://linkedin.com"
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-md p-2 transition-colors hover:bg-muted hover:text-foreground"
                aria-label="LinkedIn"
              >
                <LinkedinLogoIcon className="size-4" weight="bold" />
              </a>
              <a
                href="https://github.com"
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-md p-2 transition-colors hover:bg-muted hover:text-foreground"
                aria-label="GitHub"
              >
                <GithubLogoIcon className="size-4" weight="bold" />
              </a>
            </div>
          </div>

          {/* Demais colunas */}
          {COLUNAS.map((col) => (
            <div key={col.titulo}>
              <h3 className="text-sm font-semibold tracking-wide text-foreground">{col.titulo}</h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      className="text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-3 border-t border-border/60 pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            {textos.landing.footer.copyright(new Date().getFullYear())}
          </p>
          <p className="text-xs text-muted-foreground">{textos.landing.footer.feito}</p>
        </div>
      </div>
    </footer>
  );
}
