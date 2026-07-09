"use client";

import { CaretLeftIcon, CaretRightIcon, PlusIcon } from "@phosphor-icons/react";
import { addDays, addWeeks, format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { ItemAgendamento } from "@/components/agenda/item-agendamento";
import { NovoAgendamento } from "@/components/agenda/novo-agendamento";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/server/agenda";

type AlunoOpcao = { id: string; full_name: string };

export function AgendaSemana({
  semanaISO,
  appointments,
  alunos,
  studioName = null,
}: {
  semanaISO: string;
  appointments: Appointment[];
  alunos: AlunoOpcao[];
  studioName?: string | null;
}) {
  const router = useRouter();
  const inicio = parseISO(semanaISO);
  const dias = Array.from({ length: 7 }, (_, i) => addDays(inicio, i));
  const hoje = new Date();

  const porDia = new Map<string, Appointment[]>();
  for (const ag of appointments) {
    const lista = porDia.get(ag.appointment_date) ?? [];
    lista.push(ag);
    porDia.set(ag.appointment_date, lista);
  }

  const irPara = (iso: string) => router.push(`/agenda?semana=${iso}`);
  const fim = addDays(inicio, 6);
  const rotuloIntervalo = `${format(inicio, "d 'de' MMM", { locale: ptBR })} – ${format(fim, "d 'de' MMM", { locale: ptBR })}`;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="outline"
            aria-label="Semana anterior"
            onClick={() => irPara(format(addWeeks(inicio, -1), "yyyy-MM-dd"))}
          >
            <CaretLeftIcon className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            aria-label="Próxima semana"
            onClick={() => irPara(format(addWeeks(inicio, 1), "yyyy-MM-dd"))}
          >
            <CaretRightIcon className="size-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => router.push("/agenda")}>
            Hoje
          </Button>
          <span className="ml-2 text-sm font-medium capitalize text-muted-foreground">
            {rotuloIntervalo}
          </span>
        </div>
        <NovoAgendamento alunos={alunos} defaultDate={format(hoje, "yyyy-MM-dd")} />
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {dias.map((dia) => {
          const iso = format(dia, "yyyy-MM-dd");
          const lista = porDia.get(iso) ?? [];
          const ehHoje = isSameDay(dia, hoje);
          return (
            <div
              key={iso}
              className={cn(
                "flex min-h-32 flex-col gap-2 rounded-xl border p-2",
                ehHoje ? "border-primary/40 bg-primary/5" : "bg-muted/20",
              )}
            >
              <div className="flex items-center justify-between px-0.5">
                <div className="leading-tight">
                  <p
                    className={cn(
                      "text-xs font-semibold capitalize",
                      ehHoje ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {format(dia, "EEE", { locale: ptBR })}
                  </p>
                  <p className="text-sm font-semibold">{format(dia, "d")}</p>
                </div>
                <NovoAgendamento
                  alunos={alunos}
                  defaultDate={iso}
                  trigger={
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-6 text-muted-foreground"
                      aria-label={`Agendar em ${iso}`}
                    >
                      <PlusIcon className="size-4" />
                    </Button>
                  }
                />
              </div>
              <div className="flex flex-col gap-1.5">
                {lista.length === 0 ? (
                  <p className="px-0.5 py-2 text-[11px] text-muted-foreground/60">Sem aulas</p>
                ) : (
                  lista.map((ag) => <ItemAgendamento key={ag.id} ag={ag} studioName={studioName} />)
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
