"use client";

import {
  CaretLeftIcon,
  CaretRightIcon,
  CheckCircleIcon,
  ClipboardTextIcon,
  DotsThreeVerticalIcon,
  PulseIcon,
  SparkleIcon,
  UserIcon,
  WhatsappLogoIcon,
} from "@phosphor-icons/react";
import { addDays, format, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { NovoAgendamento } from "@/components/agenda/novo-agendamento";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { lembreteWhatsApp } from "@/lib/agenda-whatsapp";
import { rotuloStatusSessao, type StatusSessao } from "@/lib/labels";
import { cn, formatarData } from "@/lib/utils";
import { atualizarStatusAgendamento, excluirAgendamento } from "@/server/actions/agenda";
import type { AgendaDiaItem } from "@/server/agenda";

type AlunoOpcao = { id: string; full_name: string };

const VARIANTE: Record<StatusSessao, "info" | "success" | "warning" | "destructive"> = {
  scheduled: "info",
  completed: "success",
  no_show: "warning",
  cancelled: "destructive",
};

const PONTO: Record<StatusSessao, string> = {
  scheduled: "bg-info",
  completed: "bg-success",
  no_show: "bg-warning",
  cancelled: "bg-muted-foreground/40",
};

function iniciais(nome: string): string {
  const p = nome.trim().split(/\s+/);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? (p[p.length - 1][0] ?? "") : "")).toUpperCase();
}

function fim(start: string, dur: number): string {
  const [h, m] = start.split(":").map(Number);
  const t = h * 60 + m + dur;
  return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

function CardDia({ ag, studioName }: { ag: AgendaDiaItem; studioName: string | null }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const status = ag.status as StatusSessao;
  const inicio = ag.start_time.slice(0, 5);
  const nome = ag.students?.full_name ?? "Aluno";
  const registrada = ag.sessaoRegistradaId != null;
  const linkWa = lembreteWhatsApp({
    phone: ag.students?.phone,
    nome,
    data: ag.appointment_date,
    hora: ag.start_time,
    studio: studioName,
  });

  async function mudar(novo: StatusSessao) {
    setOcupado(true);
    try {
      const res = await atualizarStatusAgendamento(ag.id, novo);
      if (res.ok) {
        toast.success(`Marcada como ${rotuloStatusSessao[novo].toLowerCase()}.`);
        router.refresh();
      } else toast.error(res.erro);
    } finally {
      setOcupado(false);
    }
  }

  async function excluir(serie: boolean) {
    setOcupado(true);
    try {
      const res = await excluirAgendamento(ag.id, serie);
      if (res.ok) {
        toast.success(serie ? "Série removida." : "Aula removida.");
        router.refresh();
      } else toast.error(res.erro);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div
      className={cn(
        "flex gap-3 rounded-xl border bg-card p-3 shadow-sm transition-shadow hover:shadow-md sm:p-4",
        status === "cancelled" && "opacity-60",
      )}
    >
      {/* Faixa de horário */}
      <div className="flex w-14 shrink-0 flex-col items-center gap-1 border-r pr-3 text-center">
        <span className="font-heading text-base font-semibold tabular-nums leading-none">
          {inicio}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {fim(ag.start_time, ag.duration_min)}
        </span>
        <span className={cn("mt-0.5 size-1.5 rounded-full", PONTO[status])} />
      </div>

      {/* Conteúdo */}
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
              {iniciais(nome)}
            </span>
            <div className="min-w-0">
              <Link
                href={`/alunos/${ag.student_id}`}
                className={cn(
                  "block truncate font-medium hover:underline",
                  status === "cancelled" && "line-through",
                )}
              >
                {nome}
              </Link>
              <div className="flex items-center gap-1.5">
                <Badge variant={VARIANTE[status]} className="px-1.5 py-0 text-[10px]">
                  {rotuloStatusSessao[status]}
                </Badge>
                <span className="text-[11px] text-muted-foreground">{ag.duration_min} min</span>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                size="icon"
                variant="ghost"
                className="size-7 shrink-0"
                aria-label="Ações da aula"
                disabled={ocupado}
              >
                <DotsThreeVerticalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {status !== "completed" ? (
                <DropdownMenuItem onSelect={() => mudar("completed")}>
                  Marcar realizada
                </DropdownMenuItem>
              ) : null}
              {status !== "no_show" ? (
                <DropdownMenuItem onSelect={() => mudar("no_show")}>Marcar falta</DropdownMenuItem>
              ) : null}
              {status !== "cancelled" ? (
                <DropdownMenuItem onSelect={() => mudar("cancelled")}>Cancelar</DropdownMenuItem>
              ) : null}
              {status === "cancelled" || status === "no_show" ? (
                <DropdownMenuItem onSelect={() => mudar("scheduled")}>
                  Voltar a agendada
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => excluir(false)}>
                Excluir
              </DropdownMenuItem>
              {ag.series_id ? (
                <DropdownMenuItem variant="destructive" onSelect={() => excluir(true)}>
                  Excluir toda a série
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Contexto do aluno */}
        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {ag.condicoes.length > 0 ? (
            ag.condicoes.map((c) => (
              <span
                key={c}
                className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-warning-foreground"
              >
                <PulseIcon className="size-3" /> {c}
              </span>
            ))
          ) : (
            <span className="text-muted-foreground">Sem condições registradas</span>
          )}
          {ag.temPlano ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-primary">
              <SparkleIcon className="size-3" weight="fill" /> plano pronto
            </span>
          ) : null}
          <span className="text-muted-foreground">
            {ag.ultimaAula
              ? `Última aula: ${formatarData(ag.ultimaAula.date)}${ag.ultimaAula.focus ? ` · ${ag.ultimaAula.focus}` : ""}`
              : "Primeira aula"}
          </span>
        </div>

        {/* Ações */}
        <div className="flex flex-wrap items-center gap-2 pt-0.5">
          {registrada ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
              <CheckCircleIcon className="size-4" weight="fill" /> Aula registrada
            </span>
          ) : (
            <Button asChild size="sm">
              <Link href={`/alunos/${ag.student_id}/sessoes/nova?agendamento=${ag.id}`}>
                <ClipboardTextIcon className="size-4" /> Registrar aula
              </Link>
            </Button>
          )}
          <Button asChild size="sm" variant="outline">
            <Link href={`/alunos/${ag.student_id}`}>
              <UserIcon className="size-4" /> Ver ficha
            </Link>
          </Button>
          <Button asChild size="sm" variant="ghost">
            <Link href={`/alunos/${ag.student_id}/evolucao`}>Evolução</Link>
          </Button>
          {linkWa && status !== "cancelled" ? (
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="text-emerald-600 hover:text-emerald-700"
            >
              <a href={linkWa} target="_blank" rel="noopener noreferrer">
                <WhatsappLogoIcon className="size-4" weight="fill" /> Lembrar
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AgendaDia({
  diaISO,
  itens,
  alunos,
  studioName,
}: {
  diaISO: string;
  itens: AgendaDiaItem[];
  alunos: AlunoOpcao[];
  studioName: string | null;
}) {
  const router = useRouter();
  const dia = parseISO(diaISO);
  const hoje = new Date();
  const ehHoje = isSameDay(dia, hoje);

  const realizadas = itens.filter((i) => i.status === "completed").length;
  const irPara = (iso: string) => router.push(`/agenda?view=dia&dia=${iso}`);

  return (
    <div data-tour="agenda-conteudo" className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="outline"
            aria-label="Dia anterior"
            onClick={() => irPara(format(addDays(dia, -1), "yyyy-MM-dd"))}
          >
            <CaretLeftIcon className="size-4" />
          </Button>
          <Button
            size="icon"
            variant="outline"
            aria-label="Próximo dia"
            onClick={() => irPara(format(addDays(dia, 1), "yyyy-MM-dd"))}
          >
            <CaretRightIcon className="size-4" />
          </Button>
          {!ehHoje ? (
            <Button size="sm" variant="ghost" onClick={() => router.push("/agenda?view=dia")}>
              Hoje
            </Button>
          ) : null}
          <div className="ml-2 leading-tight">
            <p className="text-sm font-semibold capitalize">
              {ehHoje ? "Hoje" : format(dia, "EEEE", { locale: ptBR })}
            </p>
            <p className="text-xs capitalize text-muted-foreground">
              {format(dia, "d 'de' MMMM", { locale: ptBR })}
            </p>
          </div>
        </div>
        <span data-tour="agenda-nova">
          <NovoAgendamento alunos={alunos} defaultDate={diaISO} />
        </span>
      </div>

      {itens.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhuma aula neste dia. Use “Nova aula” para agendar.
        </div>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {itens.length} {itens.length === 1 ? "aula" : "aulas"}
            {realizadas > 0 ? ` · ${realizadas} realizada${realizadas > 1 ? "s" : ""}` : ""}
          </p>
          <div className="flex flex-col gap-2">
            {itens.map((ag) => (
              <CardDia key={ag.id} ag={ag} studioName={studioName} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
