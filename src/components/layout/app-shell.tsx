"use client";

import type { Icon } from "@phosphor-icons/react";
import {
  BookOpenIcon,
  ChatCircleIcon,
  GearIcon,
  HouseIcon,
  UsersIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/layout/user-menu";
import { textos } from "@/lib/textos";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; Icon: Icon };

const ITENS: Item[] = [
  { href: "/dashboard", label: textos.nav.inicio, Icon: HouseIcon },
  { href: "/alunos", label: textos.nav.alunos, Icon: UsersIcon },
  { href: "/assistente", label: textos.nav.assistente, Icon: ChatCircleIcon },
  { href: "/conhecimento", label: textos.nav.conhecimento, Icon: BookOpenIcon },
  { href: "/configuracoes", label: textos.nav.configuracoes, Icon: GearIcon },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ userName, children }: { userName: string; children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex min-h-svh flex-col md:flex-row">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-56 shrink-0 flex-col border-r p-4 md:flex">
        <Link href="/dashboard" className="mb-6 px-2 text-lg font-semibold">
          {textos.app.nome}
        </Link>
        <nav className="flex flex-col gap-1">
          {ITENS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                isActive(pathname, href) && "bg-accent font-medium text-foreground",
              )}
            >
              <Icon className="size-5" weight={isActive(pathname, href) ? "fill" : "regular"} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Header */}
        <header className="flex h-14 items-center justify-between border-b px-4">
          <span className="text-base font-semibold md:hidden">{textos.app.nome}</span>
          <div className="ml-auto">
            <UserMenu userName={userName} />
          </div>
        </header>

        {/* Conteúdo (padding inferior no mobile para não colar na bottom nav) */}
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
      </div>

      {/* Bottom nav (mobile) */}
      <nav className="fixed inset-x-0 bottom-0 z-10 flex border-t bg-background md:hidden">
        {ITENS.map(({ href, label, Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] text-muted-foreground",
              isActive(pathname, href) && "text-foreground",
            )}
          >
            <Icon className="size-5" weight={isActive(pathname, href) ? "fill" : "regular"} />
            <span className="max-w-full truncate px-1">{label}</span>
          </Link>
        ))}
      </nav>
    </div>
  );
}
