"use client";

import { BarbellIcon, PlusIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { rotuloAparelho, rotuloStatusAparelho, type StatusAparelho } from "@/lib/labels";
import type { Aparelho } from "@/server/aparelhos";

function badgeStatus(status: string) {
  const label = rotuloStatusAparelho[status as StatusAparelho] ?? status;
  const variant =
    status === "active" ? "success" : status === "maintenance" ? "warning" : "outline";
  return <Badge variant={variant}>{label}</Badge>;
}

export function ListaAparelhos({ aparelhos }: { aparelhos: Aparelho[] }) {
  if (aparelhos.length === 0) {
    return (
      <EmptyState
        icon={BarbellIcon}
        title="Você ainda não cadastrou aparelhos"
        description="Registre os aparelhos do seu estúdio (reformers, cadillacs, chairs…) para montar aulas coletivas com rotação."
        action={
          <Button asChild>
            <Link href="/aparelhos/novo">
              <PlusIcon className="size-4" /> Cadastrar aparelho
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Mobile: cards */}
      <ul className="flex flex-col gap-2 md:hidden">
        {aparelhos.map((a) => (
          <li key={a.id}>
            <Link
              href={`/aparelhos/${a.id}`}
              className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm transition-colors active:bg-accent"
            >
              <BarbellIcon className="size-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{a.label}</p>
                <p className="text-sm text-muted-foreground">
                  {rotuloAparelho[a.apparatus as keyof typeof rotuloAparelho] ?? a.apparatus}
                </p>
              </div>
              {badgeStatus(a.status)}
            </Link>
          </li>
        ))}
      </ul>

      {/* Desktop: tabela */}
      <div className="hidden overflow-x-auto rounded-lg border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rótulo</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {aparelhos.map((a) => (
              <TableRow key={a.id} className={a.status !== "active" ? "opacity-60" : undefined}>
                <TableCell>
                  <Link href={`/aparelhos/${a.id}`} className="font-medium hover:text-primary">
                    {a.label}
                  </Link>
                </TableCell>
                <TableCell>
                  {rotuloAparelho[a.apparatus as keyof typeof rotuloAparelho] ?? a.apparatus}
                </TableCell>
                <TableCell>{badgeStatus(a.status)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
