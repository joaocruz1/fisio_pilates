"use client";

import { CaretLeftIcon, CaretRightIcon, PlusIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { addDays, addWeeks, format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useRouter } from "next/navigation";
import { ItemAgendamento } from "@/components/agenda/item-agendamento";
import { ModalColetiva } from "@/components/agenda/modal-coletiva";
import { NovoAgendamento } from "@/components/agenda/novo-agendamento";
import { Button } from "@/components/ui/button";
import type { PlanoAula } from "@/lib/ai/schemas/plano-aula";
import { cn } from "@/lib/utils";
import type { AgendaColetivaItem, AgendaDiaItem } from "@/server/agenda";
import type { DadosModalColetiva } from "@/server/turmas";

type AlunoOpcao = { id: string; full_name: string };

function ItemAulaColetiva({
  item,
  dados,
}: {
  item: AgendaColetivaItem;
  dados: DadosModalColetiva | undefined;
}) {
  if (item.status === "cancelled") return null;
  return (
    <ModalColetiva
      turmaId={item.class_group_id}
      sessionId={item.id}
      item={item}
      dados={dados ?? { alunas: [], plano: null }}
      trigger={
        <button
          type="button"
          className="flex w-full items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-1.5 py-1 text-[11px] outline-none transition-colors hover:bg-primary/10 focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          <UsersThreeIcon className="size-3 shrink-0 text-primary" weight="fill" />
          <span className="font-semibold tabular-nums">{item.start_time.slice(0, 5)}</span>
          <span className="truncate text-muted-foreground">{item.turma?.name ?? "Turma"}</span>
        </button>
      }
    />
  );
}

export function AgendaSemana({
  semanaISO,
  individuais,
  coletivas = [],
  modais = {},
  planosIndividuais = {},
  alunos,
  studioName = null,
}: {
  semanaISO: string;
  individuais: AgendaDiaItem[];
  coletivas?: AgendaColetivaItem[];
  modais?: Record<string, DadosModalColetiva>;
  planosIndividuais?: Record<string, PlanoAula | null>;
  alunos: AlunoOpcao[];
  studioName?: string | null;
}) {
  const router = useRouter();
  const inicio = parseISO(semanaISO);
  const dias = Array.from({ length: 7 }, (_, i) => addDays(inicio, i));
  const hoje = new Date();

  const porDia = new Map<
    string,
    { individuais: AgendaDiaItem[]; coletivas: AgendaColetivaItem[] }
  >();
  const bucket = (iso: string) => {
    let b = porDia.get(iso);
    if (!b) {
      b = { individuais: [], coletivas: [] };
      porDia.set(iso, b);
    }
    return b;
  };
  for (const ag of individuais) bucket(ag.appointment_date).individuais.push(ag);
  for (const c of coletivas) bucket(c.session_date).coletivas.push(c);

  const irPara = (iso: string) => router.push(`/agenda?semana=${iso}`);
  const finalSemana = addDays(inicio, 6);
  const rotuloIntervalo = `${format(inicio, "d 'de' MMM", { locale: ptBR })} – ${format(finalSemana, "d 'de' MMM", { locale: ptBR })}`;

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
          const bucketDia = porDia.get(iso);
          const indivDia = bucketDia?.individuais ?? [];
          const coletivasDia = bucketDia?.coletivas ?? [];
          const total = indivDia.length + coletivasDia.length;
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
                {total === 0 ? (
                  <p className="px-0.5 py-2 text-[11px] text-muted-foreground/60">Sem aulas</p>
                ) : (
                  <>
                    {indivDia.map((ag) => (
                      <ItemAgendamento
                        key={ag.id}
                        ag={ag}
                        plano={
                          ag.planoReportId ? (planosIndividuais[ag.planoReportId] ?? null) : null
                        }
                        studioName={studioName}
                      />
                    ))}
                    {coletivasDia.map((c) => (
                      <ItemAulaColetiva key={c.id} item={c} dados={modais[c.id]} />
                    ))}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
