"use client";

import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { rotuloTipoAvaliacao, type TipoAvaliacao } from "@/lib/labels";
import { formatarData } from "@/lib/utils";
import { excluirAvaliacao } from "@/server/actions/avaliacoes";
import type { Assessment } from "@/server/assessments";

export function ListaAvaliacoes({
  studentId,
  avaliacoes,
}: {
  studentId: string;
  avaliacoes: Assessment[];
}) {
  const router = useRouter();

  async function excluir(id: string) {
    const res = await excluirAvaliacao(id, studentId);
    if (res.ok) {
      toast.success("Avaliação excluída.");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  if (avaliacoes.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma avaliação registrada ainda.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {avaliacoes.map((a) => (
        <li key={a.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant={a.kind === "initial" ? "default" : "secondary"}>
                {rotuloTipoAvaliacao[a.kind as TipoAvaliacao] ?? a.kind}
              </Badge>
              <span className="text-sm text-muted-foreground">{formatarData(a.assessed_at)}</span>
              {a.pain_level_initial != null ? (
                <span className="text-sm text-muted-foreground">Dor {a.pain_level_initial}/10</span>
              ) : null}
            </div>
            {a.main_complaint ? <p className="mt-1 truncate text-sm">{a.main_complaint}</p> : null}
          </div>
          <div className="flex shrink-0 gap-1">
            <Button size="icon" variant="ghost" asChild aria-label="Editar avaliação">
              <Link href={`/alunos/${studentId}/avaliacao/${a.id}`}>
                <PencilSimpleIcon className="size-4" />
              </Link>
            </Button>
            <ConfirmDialog
              title="Excluir esta avaliação?"
              description="A avaliação será removida do histórico."
              confirmLabel="Excluir"
              destructive
              onConfirm={() => excluir(a.id)}
              trigger={
                <Button size="icon" variant="ghost" aria-label="Excluir avaliação">
                  <TrashIcon className="size-4" />
                </Button>
              }
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
