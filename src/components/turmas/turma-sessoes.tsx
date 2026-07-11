"use client";

import { CalendarPlusIcon, SparkleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { GerarPlanoColetivo } from "@/components/turmas/gerar-plano-coletivo";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { rotuloStatusClassSession, type StatusClassSession } from "@/lib/labels";
import { formatarData } from "@/lib/utils";
import { agendarClassSession } from "@/server/actions/turmas";
import type { ClassSession } from "@/server/turmas";

const VARIANTE: Record<StatusClassSession, "info" | "success" | "destructive"> = {
  scheduled: "info",
  completed: "success",
  cancelled: "destructive",
};

function NovoAgendamentoTurma({
  classGroupId,
  defaultDurationMin,
}: {
  classGroupId: string;
  defaultDurationMin: number;
}) {
  const router = useRouter();
  const [data, setData] = useState("");
  const [hora, setHora] = useState("");
  const [duracao, setDuracao] = useState(String(defaultDurationMin));
  const [foco, setFoco] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function agendar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!data || !hora) {
      setErro("Informe data e horário.");
      return;
    }
    setOcupado(true);
    try {
      const res = await agendarClassSession({
        classGroupId,
        sessionDate: data,
        startTime: hora,
        durationMin: Number(duracao) || defaultDurationMin,
        focus: foco || undefined,
      });
      if (res.ok) {
        toast.success("Aula agendada.");
        setData("");
        setHora("");
        setFoco("");
        router.refresh();
      } else {
        setErro(res.erro);
      }
    } finally {
      setOcupado(false);
    }
  }

  return (
    <form onSubmit={agendar} className="rounded-lg border bg-muted/30 p-4">
      <FieldGroup>
        <div className="grid gap-3 sm:grid-cols-3">
          <Field>
            <FieldLabel htmlFor={`data-${classGroupId}`}>Data</FieldLabel>
            <Input
              id={`data-${classGroupId}`}
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`hora-${classGroupId}`}>Horário</FieldLabel>
            <Input
              id={`hora-${classGroupId}`}
              type="time"
              value={hora}
              onChange={(e) => setHora(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor={`dur-${classGroupId}`}>Duração (min)</FieldLabel>
            <Input
              id={`dur-${classGroupId}`}
              type="number"
              min={10}
              max={180}
              value={duracao}
              onChange={(e) => setDuracao(e.target.value)}
            />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor={`foco-${classGroupId}`}>Foco (opcional)</FieldLabel>
          <Textarea
            id={`foco-${classGroupId}`}
            rows={2}
            value={foco}
            onChange={(e) => setFoco(e.target.value)}
            placeholder="Ex.: Core + mobilidade torácica"
          />
        </Field>
        {erro ? (
          <FieldError errors={[{ message: erro } as unknown as { message: string }]} />
        ) : null}
        <Button type="submit" disabled={ocupado}>
          <CalendarPlusIcon className="size-4" /> Agendar aula
        </Button>
      </FieldGroup>
    </form>
  );
}

export function TurmaSessoes({
  classGroupId,
  sessoes,
  defaultDurationMin,
}: {
  classGroupId: string;
  sessoes: ClassSession[];
  defaultDurationMin: number;
}) {
  return (
    <div className="flex flex-col gap-4">
      <NovoAgendamentoTurma classGroupId={classGroupId} defaultDurationMin={defaultDurationMin} />

      {sessoes.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Nenhuma aula agendada para esta turma ainda.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {sessoes.map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border bg-card p-3 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {formatarData(s.session_date)} · {s.start_time.slice(0, 5)} ({s.duration_min} min)
                </p>
                {s.focus ? (
                  <p className="truncate text-xs text-muted-foreground">Foco: {s.focus}</p>
                ) : null}
              </div>
              <Badge variant={VARIANTE[s.status as StatusClassSession]}>
                {rotuloStatusClassSession[s.status as StatusClassSession]}
              </Badge>
              {s.plan_report_id ? (
                <Button asChild size="sm" variant="outline">
                  <Link href={`/turmas/${classGroupId}/aulas/${s.id}/plano`}>
                    <SparkleIcon className="size-4" /> Ver plano
                  </Link>
                </Button>
              ) : (
                <GerarPlanoColetivo turmaId={classGroupId} sessionId={s.id} />
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
