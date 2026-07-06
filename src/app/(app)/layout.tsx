import Link from "next/link";
import { textos } from "@/lib/textos";

const itens = [
  { href: "/dashboard", label: textos.nav.inicio },
  { href: "/alunos", label: textos.nav.alunos },
  { href: "/assistente", label: textos.nav.assistente },
  { href: "/conhecimento", label: textos.nav.conhecimento },
  { href: "/configuracoes", label: textos.nav.configuracoes },
];

/**
 * Shell da área logada. A proteção real (sessão + tenant) e a sidebar/bottom-nav
 * definitivas chegam na Fase 1 — ver docs/plan/05-frontend-ux.md.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      <aside className="border-b p-4 md:w-56 md:border-r md:border-b-0">
        <span className="mb-4 block text-lg font-semibold">{textos.app.nome}</span>
        <nav className="flex gap-3 overflow-x-auto md:flex-col md:gap-1">
          {itens.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}
