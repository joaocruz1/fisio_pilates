"use client";

import { CalendarPlusIcon } from "@phosphor-icons/react";
import { ItemAgendamento } from "@/components/agenda/item-agendamento";
import { NovoAgendamento } from "@/components/agenda/novo-agendamento";
import { Button } from "@/components/ui/button";
import type { Appointment } from "@/server/agenda";

/** Próximas aulas agendadas de um aluno + botão para agendar (na ficha). */
export function AgendamentosAluno({
  studentId,
  studentName,
  proximas,
  studioName = null,
}: {
  studentId: string;
  studentName: string;
  proximas: Appointment[];
  studioName?: string | null;
}) {
  const alunos = [{ id: studentId, full_name: studentName }];

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-heading text-sm font-semibold">Próximas aulas</h3>
        <NovoAgendamento
          alunos={alunos}
          defaultStudentId={studentId}
          trigger={
            <Button size="sm" variant="outline">
              <CalendarPlusIcon className="size-4" /> Agendar aula
            </Button>
          }
        />
      </div>
      {proximas.length === 0 ? (
        <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
          Nenhuma aula agendada. Use “Agendar aula” para marcar as próximas.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {proximas.map((ag) => (
            <ItemAgendamento key={ag.id} ag={ag} studioName={studioName} />
          ))}
        </div>
      )}
    </section>
  );
}
