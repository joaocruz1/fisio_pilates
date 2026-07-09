"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function AlunoTabs({ base }: { base: string }) {
  const pathname = usePathname();
  const abas = [
    { href: base, label: "Dados" },
    { href: `${base}/avaliacao`, label: "Avaliação" },
    { href: `${base}/sessoes`, label: "Aulas" },
    { href: `${base}/documentos`, label: "Documentos" },
    { href: `${base}/evolucao`, label: "Evolução" },
  ];

  return (
    <nav className="flex gap-1 overflow-x-auto border-b px-2">
      {abas.map((aba) => {
        const active = aba.href === base ? pathname === base : pathname.startsWith(aba.href);
        return (
          <Link
            key={aba.href}
            href={aba.href}
            className={cn(
              "whitespace-nowrap border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground",
              active && "border-primary font-medium text-foreground",
            )}
          >
            {aba.label}
          </Link>
        );
      })}
    </nav>
  );
}
