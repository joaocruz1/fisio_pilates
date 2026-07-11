"use client";

import {
  ArrowUpRightIcon,
  CheckCircleIcon,
  ClipboardTextIcon,
  DotsThreeVerticalIcon,
  ProhibitIcon,
  SparkleIcon,
  TrashIcon,
  UserIcon,
  WhatsappLogoIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";
import { toast } from "sonner";
import { PlanoAulaCard } from "@/components/sessoes/plano-aula-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { lembreteWhatsApp } from "@/lib/agenda-whatsapp";
import type { PlanoAula } from "@/lib/ai/schemas/plano-aula";
import { rotuloStatusSessao, type StatusSessao } from "@/lib/labels";
import { cn, formatarData } from "@/lib/utils";
import { atualizarStatusAgendamento, excluirAgendamento } from "@/server/actions/agenda";
import type { AgendaDiaItem } from "@/server/agenda";

const VARIANTE: Record<StatusSessao, "info" | "success" | "warning" | "destructive"> = {
  scheduled: "info",
  completed: "success",
  no_show: "warning",
  cancelled: "destructive",
};

function fim(start: string, dur: number): string {
  const [h, m] = start.split(":").map(Number);
  const t = h * 60 + m + dur;
  return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/**
 * Modal do atendimento individual na agenda: ficha resumida do aluno
 * (condições, última aula) + plano da próxima aula (se pronto) + atalhos e
 * gestão de status. Reusa as mesmas server actions do card.
 */
export function ModalAgendamento({
  ag,
  plano,
  studioName,
  trigger,
}: {
  ag: AgendaDiaItem;
  plano: PlanoAula | null;
  studioName?: string | null;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const status = ag.status as StatusSessao;
  const inicio = ag.start_time.slice(0, 5);
  const nome = ag.students?.full_name ?? "Aluno";
  const registrada = ag.sessaoRegistradaId != null;
  const cancelada = status === "cancelled";
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
      } else {
        toast.error(res.erro);
      }
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
      } else {
        toast.error(res.erro);
      }
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[88vh] gap-0 overflow-hidden p-0 sm:max-w-3xl">
        {/* Header */}
        <div className="flex items-start gap-3 border-b px-5 py-4">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {nome
              .trim()
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p[0] ?? "")
              .join("")
              .toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="font-heading text-base font-semibold leading-tight">
              {nome}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              {format(parseISO(ag.appointment_date), "EEEE, d 'de' MMMM", { locale: ptBR })} ·{" "}
              <span className="tabular-nums">
                {inicio}–{fim(ag.start_time, ag.duration_min)}
              </span>{" "}
              · {ag.duration_min} min
            </p>
            <div className="mt-1.5 flex items-center gap-1.5">
              <Badge variant={VARIANTE[status]} className="text-[10px]">
                {rotuloStatusSessao[status]}
              </Badge>
              {ag.temPlano ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-[11px] text-primary">
                  <SparkleIcon className="size-3" weight="fill" /> plano pronto
                </span>
              ) : null}
              {registrada ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-success">
                  <CheckCircleIcon className="size-3.5" weight="fill" /> aula registrada
                </span>
              ) : null}
            </div>
          </div>

          {/* Dropdown de status — irmão, fora do conteúdo interativo do trigger */}
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
                  <CheckCircleIcon className="size-4 text-success" /> Marcar realizada
                </DropdownMenuItem>
              ) : null}
              {status !== "no_show" ? (
                <DropdownMenuItem onSelect={() => mudar("no_show")}>
                  <XCircleIcon className="size-4 text-warning-foreground" /> Marcar falta
                </DropdownMenuItem>
              ) : null}
              {status !== "cancelled" ? (
                <DropdownMenuItem onSelect={() => mudar("cancelled")}>
                  <ProhibitIcon className="size-4" /> Cancelar
                </DropdownMenuItem>
              ) : null}
              {status === "cancelled" || status === "no_show" ? (
                <DropdownMenuItem onSelect={() => mudar("scheduled")}>
                  Voltar a agendada
                </DropdownMenuItem>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => excluir(false)}>
                <TrashIcon className="size-4" /> Excluir
              </DropdownMenuItem>
              {ag.series_id ? (
                <DropdownMenuItem variant="destructive" onSelect={() => excluir(true)}>
                  <TrashIcon className="size-4" /> Excluir toda a série
                </DropdownMenuItem>
              ) : null}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Corpo com scroll */}
        <div className="flex max-h-[calc(88vh-8rem)] flex-col gap-4 overflow-y-auto px-5 py-4">
          {/* Contexto do aluno */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Contexto
            </h3>
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              {ag.condicoes.length > 0 ? (
                ag.condicoes.map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-warning/15 px-2 py-0.5 text-warning-foreground"
                  >
                    {c}
                  </span>
                ))
              ) : (
                <span className="text-muted-foreground">Sem condições registradas</span>
              )}
              <span className="text-muted-foreground">
                {ag.ultimaAula
                  ? `Última aula: ${formatarData(ag.ultimaAula.date)}${ag.ultimaAula.focus ? ` · ${ag.ultimaAula.focus}` : ""}`
                  : "Primeira aula"}
              </span>
            </div>
          </section>

          {/* Plano da próxima aula */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Plano da próxima aula
            </h3>
            {plano && ag.planoReportId ? (
              <>
                <PlanoAulaCard plano={plano} naoEncontrados={[]} />
                <Button asChild size="sm" variant="outline">
                  <Link
                    href={`/alunos/${ag.student_id}/sessoes/nova?plano=${ag.planoReportId}&agendamento=${ag.id}`}
                  >
                    <ClipboardTextIcon className="size-4" /> Usar plano na nova aula
                  </Link>
                </Button>
              </>
            ) : (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-dashed p-3 text-sm">
                <span className="text-muted-foreground">
                  Sem plano pronto. Gere ou revise na ficha do aluno.
                </span>
                <Button asChild size="sm" variant="ghost">
                  <Link href={`/alunos/${ag.student_id}`}>
                    <ArrowUpRightIcon className="size-4" /> Abrir ficha
                  </Link>
                </Button>
              </div>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-2 border-t px-5 py-3">
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
          {linkWa && !cancelada ? (
            <Button
              asChild
              size="sm"
              variant="ghost"
              className="ml-auto text-emerald-600 hover:text-emerald-700"
            >
              <a href={linkWa} target="_blank" rel="noopener noreferrer">
                <WhatsappLogoIcon className="size-4" weight="fill" /> Lembrar
              </a>
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Reuso: envoltório para o chip da semana (trigger compacto). */
export function ChipAgendamento({
  className,
  children,
}: {
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "flex items-start gap-2 rounded-lg border bg-card p-2 text-xs shadow-sm transition-colors",
        className,
      )}
    >
      {children}
    </span>
  );
}
