import { SparkleIcon } from "@phosphor-icons/react/ssr";
import { textos } from "@/lib/textos";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      {/* Painel de marca (desktop) */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-brand-gradient p-10 text-primary-foreground lg:flex">
        <div className="relative z-10 flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-white/15">
            <SparkleIcon weight="fill" className="size-5" />
          </span>
          <span className="font-heading text-xl font-semibold">{textos.app.nome}</span>
        </div>
        <div className="relative z-10 max-w-sm">
          <h2 className="font-heading text-3xl font-semibold leading-tight">
            Gestão de alunos e evolução no Pilates com apoio de IA.
          </h2>
          <p className="mt-3 text-primary-foreground/80">
            Fichas, aulas, documentos e relatórios inteligentes — tudo num só lugar.
          </p>
        </div>
        <span className="relative z-10 text-sm text-primary-foreground/70">
          © {textos.app.nome}
        </span>
        <span className="pointer-events-none absolute -top-16 -right-16 size-64 rounded-full bg-white/10 blur-2xl" />
        <span className="pointer-events-none absolute -bottom-20 -left-10 size-72 rounded-full bg-white/10 blur-3xl" />
      </div>

      {/* Formulário */}
      <div className="flex flex-col items-center justify-center gap-6 p-6">
        <span className="flex items-center gap-2 lg:hidden">
          <span className="flex size-8 items-center justify-center rounded-lg bg-brand-gradient text-primary-foreground">
            <SparkleIcon weight="fill" className="size-4" />
          </span>
          <span className="font-heading text-lg font-semibold">{textos.app.nome}</span>
        </span>
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
