"use client";

import { MagnifyingGlassIcon, UserPlusIcon, WhatsappLogoIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { rotuloStatusAluno, type StatusAluno } from "@/lib/labels";
import { cn, idadeAnos, linkWhatsApp } from "@/lib/utils";
import type { Student } from "@/server/students";

type Filtro = "ativos" | "arquivados" | "todos";

const FILTROS: { valor: Filtro; label: string }[] = [
  { valor: "ativos", label: "Ativos" },
  { valor: "arquivados", label: "Arquivados" },
  { valor: "todos", label: "Todos" },
];

function badgeStatus(status: string) {
  const label = rotuloStatusAluno[status as StatusAluno] ?? status;
  const variant = status === "active" ? "default" : status === "archived" ? "outline" : "secondary";
  return <Badge variant={variant}>{label}</Badge>;
}

function LinkWhats({ phone }: { phone: string | null }) {
  const href = linkWhatsApp(phone);
  if (!href) return <span className="text-muted-foreground">—</span>;
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      className="inline-flex items-center gap-1 text-primary hover:underline"
    >
      <WhatsappLogoIcon className="size-4" /> {phone}
    </a>
  );
}

export function ListaAlunos({ alunos }: { alunos: Student[] }) {
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState<Filtro>("ativos");

  const filtrados = useMemo(() => {
    const q = query.trim().toLowerCase();
    return alunos.filter((a) => {
      const passaStatus =
        filtro === "todos" ||
        (filtro === "arquivados" ? a.status === "archived" : a.status !== "archived");
      const passaBusca = !q || a.full_name.toLowerCase().includes(q);
      return passaStatus && passaBusca;
    });
  }, [alunos, query, filtro]);

  if (alunos.length === 0) {
    return (
      <EmptyState
        icon={UserPlusIcon}
        title="Você ainda não tem alunos"
        description="Cadastre sua primeira aluna para começar."
        action={
          <Button asChild>
            <Link href="/alunos/novo">Cadastrar aluno</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nome"
            className="pl-9"
            aria-label="Buscar aluno por nome"
          />
        </div>
        <div className="flex gap-1">
          {FILTROS.map((f) => (
            <Button
              key={f.valor}
              size="sm"
              variant={filtro === f.valor ? "default" : "outline"}
              onClick={() => setFiltro(f.valor)}
            >
              {f.label}
            </Button>
          ))}
        </div>
      </div>

      {filtrados.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Nenhum aluno encontrado.</p>
      ) : (
        <>
          {/* Mobile: cards */}
          <ul className="flex flex-col gap-2 md:hidden">
            {filtrados.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/alunos/${a.id}`}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3 active:bg-accent"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{a.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {idadeAnos(a.birth_date) != null ? `${idadeAnos(a.birth_date)} anos` : "—"}
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
                  <TableHead>Nome</TableHead>
                  <TableHead>Idade</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtrados.map((a) => (
                  <TableRow key={a.id} className={cn(a.status === "archived" && "opacity-60")}>
                    <TableCell>
                      <Link href={`/alunos/${a.id}`} className="font-medium hover:underline">
                        {a.full_name}
                      </Link>
                    </TableCell>
                    <TableCell>{idadeAnos(a.birth_date) ?? "—"}</TableCell>
                    <TableCell>
                      <LinkWhats phone={a.phone} />
                    </TableCell>
                    <TableCell>{badgeStatus(a.status)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
