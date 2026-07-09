"use client";

import { TrashIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { formatarData } from "@/lib/utils";
import { excluirSessao } from "@/server/actions/sessoes";
import type { SessionWithExercises } from "@/server/sessions";

export function HistoricoSessoes({
  studentId,
  sessoes,
}: {
  studentId: string;
  sessoes: SessionWithExercises[];
}) {
  const router = useRouter();

  async function excluir(id: string) {
    const res = await excluirSessao(id, studentId);
    if (res.ok) {
      toast.success("Aula excluída.");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  if (sessoes.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhuma aula registrada ainda.</p>;
  }

  return (
    <ul className="flex flex-col gap-3">
      {sessoes.map((s) => (
        <li key={s.id} className="rounded-lg border p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="font-medium">{formatarData(s.session_date)}</p>
              <p className="text-sm text-muted-foreground">
                {s.duration_min ? `${s.duration_min} min` : "Duração não informada"}
                {s.focus ? ` · ${s.focus}` : ""}
              </p>
            </div>
            <ConfirmDialog
              title="Excluir esta aula?"
              description="A aula e seus exercícios serão removidos do histórico."
              confirmLabel="Excluir"
              destructive
              onConfirm={() => excluir(s.id)}
              trigger={
                <Button size="icon" variant="ghost" aria-label="Excluir aula">
                  <TrashIcon className="size-4" />
                </Button>
              }
            />
          </div>

          {(s.pain_level_pre != null || s.pain_level_post != null) && (
            <p className="mt-1 text-sm text-muted-foreground">
              Dor: {s.pain_level_pre ?? "—"} → {s.pain_level_post ?? "—"}
            </p>
          )}

          {s.exercises.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1 text-sm">
              {s.exercises.map((ex) => (
                <li key={ex.id} className="flex justify-between gap-3">
                  <span>{ex.exerciseName}</span>
                  <span className="text-muted-foreground">
                    {[
                      ex.sets && ex.reps ? `${ex.sets}×${ex.reps}` : null,
                      ex.load_springs,
                      ex.resistance_level ? `nível ${ex.resistance_level}` : null,
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {s.notes ? <p className="mt-3 text-sm text-muted-foreground">{s.notes}</p> : null}
        </li>
      ))}
    </ul>
  );
}
