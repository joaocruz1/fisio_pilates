"use client";

import type { Icon } from "@phosphor-icons/react";
import {
  BookOpenIcon,
  BrainIcon,
  ChartLineUpIcon,
  ClipboardTextIcon,
  CreditCardIcon,
  GearIcon,
  ReceiptIcon,
  ShieldIcon,
  UsersIcon,
} from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { textos } from "@/lib/textos";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; Icon: Icon };

export function AdminSidebar({ role }: { role: string }) {
  const pathname = usePathname();
  const ITENS: Item[] = [
    { href: "/admin", label: textos.admin.nav.dashboard, Icon: ChartLineUpIcon },
    { href: "/admin/tenants", label: textos.admin.nav.tenants, Icon: UsersIcon },
    { href: "/admin/subscriptions", label: textos.admin.nav.subscriptions, Icon: CreditCardIcon },
    { href: "/admin/invoices", label: textos.admin.nav.invoices, Icon: ReceiptIcon },
    { href: "/admin/ai-usage", label: textos.admin.nav.aiUsage, Icon: BrainIcon },
    { href: "/admin/kb", label: textos.admin.nav.kb, Icon: BookOpenIcon },
    { href: "/admin/lgpd", label: textos.admin.nav.lgpd, Icon: ShieldIcon },
    { href: "/admin/audit", label: textos.admin.nav.audit, Icon: ClipboardTextIcon },
  ];
  if (role === "super_admin") {
    ITENS.push({ href: "/admin/admins", label: textos.admin.nav.admins, Icon: GearIcon });
  }
  return (
    <aside className="hidden w-56 shrink-0 flex-col gap-1 border-r bg-sidebar p-4 md:flex">
      <Link href="/admin" className="mb-4 flex items-center gap-2 px-1">
        <ShieldIcon className="size-5 text-primary" weight="fill" />
        <span className="font-heading text-base font-semibold">Admin</span>
      </Link>
      <nav className="flex flex-col gap-1">
        {ITENS.map(({ href, label, Icon }) => {
          const active =
            pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
