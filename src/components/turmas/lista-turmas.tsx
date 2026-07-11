"use client";

import { PlusIcon, UsersThreeIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DIAS_SEMANA, rotuloStatusTurma, type StatusTurma } from "@/lib/labels";
import type { Turma } from "@/server/turmas";

function badgeStatus(status: string) {
  const label = rotuloStatusTurma[status as StatusTurma] ?? status;
  const variant = status === "active" ? "success" : "outline";
  return <Badge variant={variant}>{label}</Badge>;
}

function horarioHabitual(t: Turma): string | null {
  if (t.weekday == null && !t.start_time) return null;
  const partes: string[] = [];
  if (t.weekday != null) partes.push(DIAS_SEMANA[t.weekday] ?? "");
  if (t.start_time) partes.push(t.start_time.slice(0, 5));
  return partes.join(" ") || null;
}

export function ListaTurmas({ turmas }: { turmas: Turma[] }) {
  if (turmas.length === 0) {
    return (
      <EmptyState
        icon={UsersThreeIcon}
        title="Você ainda não tem turmas"
        description="Crie uma turma para reunir alunas num mesmo horário e gerar o plano de aula coletiva com rotação de aparelhos."
        action={
          <Button asChild>
            <Link href="/turmas/novo">
              <PlusIcon className="size-4" /> Criar turma
            </Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <ul className="flex flex-col gap-2">
        {turmas.map((t) => (
          <li key={t.id}>
            <Link
              href={`/turmas/${t.id}`}
              className="flex items-center gap-3 rounded-xl border bg-card p-3 shadow-sm transition-colors hover:bg-accent sm:p-4"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UsersThreeIcon className="size-5" weight="fill" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{t.name}</p>
                <p className="text-sm text-muted-foreground">
                  {horarioHabitual(t) ?? "Sem horário habitual"} · até {t.max_students} alunas ·{" "}
                  {t.default_duration_min} min
                </p>
              </div>
              {badgeStatus(t.status)}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
