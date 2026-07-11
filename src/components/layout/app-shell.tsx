"use client";

import type { Icon } from "@phosphor-icons/react";
import {
  BarbellIcon,
  BookOpenIcon,
  CalendarDotsIcon,
  ChatCircleIcon,
  GearIcon,
  HouseIcon,
  QuestionIcon,
  UsersIcon,
  UsersThreeIcon,
} from "@phosphor-icons/react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "@/components/layout/user-menu";
import { TourProvider } from "@/components/tour/tour-provider";
import { WelcomeOnboarding } from "@/components/tour/welcome-onboarding";
import { textos } from "@/lib/textos";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; Icon: Icon };

const ITENS: Item[] = [
  { href: "/dashboard", label: textos.nav.inicio, Icon: HouseIcon },
  { href: "/alunos", label: textos.nav.alunos, Icon: UsersIcon },
  { href: "/agenda", label: textos.nav.agenda, Icon: CalendarDotsIcon },
  { href: "/turmas", label: textos.nav.turmas, Icon: UsersThreeIcon },
  { href: "/aparelhos", label: textos.nav.aparelhos, Icon: BarbellIcon },
  { href: "/assistente", label: textos.nav.assistente, Icon: ChatCircleIcon },
  { href: "/conhecimento", label: textos.nav.conhecimento, Icon: BookOpenIcon },
  { href: "/configuracoes", label: textos.nav.configuracoes, Icon: GearIcon },
  { href: "/ajuda", label: textos.nav.ajuda, Icon: QuestionIcon },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Marca() {
  return (
    <Link href="/dashboard" className="flex items-center gap-2 px-1">
      <Image
        src="/logo.png"
        alt=""
        width={32}
        height={32}
        priority
        className="size-8 rounded-lg shadow-sm shadow-primary/20"
      />
      <span className="font-heading text-lg font-semibold tracking-tight">{textos.app.nome}</span>
    </Link>
  );
}

export function AppShell({
  userName,
  tourPending = false,
  primeiroAlunoId = null,
  children,
}: {
  userName: string;
  tourPending?: boolean;
  primeiroAlunoId?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <TourProvider alunoId={primeiroAlunoId}>
      <WelcomeOnboarding nome={userName} pending={tourPending} />
      <div className="flex min-h-svh flex-col md:flex-row">
        {/* Sidebar (desktop) */}
        <aside className="hidden w-60 shrink-0 flex-col gap-6 border-r bg-sidebar p-4 md:flex">
          <Marca />
          <nav data-tour="nav-menu" className="flex flex-col gap-1">
            {ITENS.map(({ href, label, Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    active
                      ? "text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {active ? (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-lg bg-primary/10 ring-1 ring-primary/15"
                      transition={{ type: "spring", stiffness: 350, damping: 30 }}
                    />
                  ) : null}
                  <Icon className="relative size-5" weight={active ? "fill" : "regular"} />
                  <span className="relative font-medium">{label}</span>
                </Link>
              );
            })}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header */}
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur-sm">
            <span className="font-heading text-base font-semibold md:hidden">
              {textos.app.nome}
            </span>
            <div className="ml-auto">
              <UserMenu userName={userName} />
            </div>
          </header>

          <main className="flex-1 pb-20 md:pb-0">{children}</main>
        </div>

        {/* Bottom nav (mobile) */}
        <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t bg-background/90 backdrop-blur-sm md:hidden">
          {ITENS.map(({ href, label, Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "relative flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] transition-colors",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                {active ? (
                  <motion.span
                    layoutId="bottomnav-active"
                    className="absolute top-0 h-0.5 w-8 rounded-full bg-primary"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                ) : null}
                <Icon className="size-5" weight={active ? "fill" : "regular"} />
                <span className="max-w-full truncate px-1">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </TourProvider>
  );
}
