import Link from "next/link";
import { LogoMarca } from "@/components/brand/logo";
import { textos } from "@/lib/textos";

/**
 * Layout das páginas de autenticação (`/login`, `/cadastro`).
 *
 * É o destino imediato do CTA primário da landing, então herda a gramática dela:
 * um eixo vertical, o texto pendurado nele, nada centralizado. Saíram os três
 * blobs, a grade mascarada e as pílulas — eram o hero antigo replicado aqui, e
 * a costura entre as duas páginas apareceria no primeiro clique.
 *
 * O painel continua em bg-brand-gradient: é a única superfície do produto onde
 * a marca fala alto, e é a passagem de fora para dentro. Na landing o azul só
 * assina; aqui ele recebe.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Painel de marca (desktop) */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-gradient p-10 text-primary-foreground lg:flex">
        {/* O mesmo prumo da landing, na tinta do painel. */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-10 w-px bg-white/25"
        />

        <Link href="/" className="relative z-10 inline-flex w-fit" aria-label={textos.app.nome}>
          <LogoMarca tamanho={36} wordmark="claro" classNameNome="text-xl" prioridade />
        </Link>

        <div className="relative z-10 max-w-sm">
          <h2 className="font-heading text-3xl font-semibold leading-[1.1]">
            {textos.landing.identificacao.h1a}
            <br />
            {textos.landing.identificacao.h1b}
          </h2>
          <p className="mt-4 text-primary-foreground/85">{textos.landing.identificacao.sub}</p>
          <p className="mt-8 text-sm text-primary-foreground/70">
            {textos.landing.identificacao.selo}
          </p>
        </div>

        <span className="relative z-10 text-sm text-primary-foreground/70">
          {textos.landing.footer.feito}
        </span>
      </div>

      {/* Formulário */}
      <div className="flex flex-col items-center justify-center gap-6 p-6 sm:p-10">
        <Link href="/" className="inline-flex lg:hidden" aria-label={textos.app.nome}>
          <LogoMarca tamanho={32} prioridade />
        </Link>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
