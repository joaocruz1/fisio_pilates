import { SparkleIcon } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { textos } from "@/lib/textos";

/**
 * Layout das páginas de autenticação (`/login`, `/cadastro`).
 * Mantém o painel de marca à esquerda em desktop com o mesmo gradient
 * e padrão visual da landing. Em mobile, mostra o logo no topo do formulário.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Painel de marca (desktop) */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-gradient p-10 text-primary-foreground lg:flex">
        {/* Decoração de fundo — mesmo padrão do hero da landing */}
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
        <span className="pointer-events-none absolute -top-16 -right-16 size-64 rounded-full bg-white/10 blur-2xl" />
        <span className="pointer-events-none absolute -bottom-20 -left-10 size-72 rounded-full bg-white/10 blur-3xl" />
        <span className="pointer-events-none absolute top-1/3 right-1/4 size-40 rounded-full bg-white/5 blur-2xl" />

        <Link href="/" className="relative z-10 inline-flex w-fit items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-white/15">
            <SparkleIcon weight="fill" className="size-5" />
          </span>
          <span className="font-heading text-xl font-semibold">{textos.app.nome}</span>
        </Link>

        <div className="relative z-10 max-w-sm">
          <h2 className="font-heading text-3xl font-semibold leading-tight">
            {textos.landing.hero.h1.split(",")[0]}.
          </h2>
          <p className="mt-3 text-primary-foreground/85">{textos.landing.hero.sub}</p>

          <div className="mt-8 flex flex-wrap gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-primary-foreground">
              <span className="size-1.5 rounded-full bg-white" />
              {textos.landing.hero.seloTrial}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-medium text-primary-foreground">
              <span className="size-1.5 rounded-full bg-white" />
              {textos.landing.hero.seloBrasil}
            </span>
          </div>
        </div>

        <span className="relative z-10 text-sm text-primary-foreground/70">
          © {textos.app.nome} · {textos.landing.footer.feito}
        </span>
      </div>

      {/* Formulário */}
      <div className="flex flex-col items-center justify-center gap-6 p-6 sm:p-10">
        <Link href="/" className="inline-flex items-center gap-2 lg:hidden">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-gradient text-primary-foreground">
            <SparkleIcon weight="fill" className="size-4" />
          </span>
          <span className="font-heading text-lg font-semibold">{textos.app.nome}</span>
        </Link>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
