"use client";

import {
  CheckCircleIcon,
  ClipboardTextIcon,
  DotsThreeVerticalIcon,
  ProhibitIcon,
  SparkleIcon,
  TrashIcon,
  WhatsappLogoIcon,
  XCircleIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ModalAgendamento } from "@/components/agenda/modal-agendamento";
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
import type { PlanoAula } from "@/lib/ai/schemas/plano-aula";
import { rotuloStatusSessao, type StatusSessao } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { atualizarStatusAgendamento, excluirAgendamento } from "@/server/actions/agenda";
import type { AgendaDiaItem } from "@/server/agenda";

const VARIANTE: Record<StatusSessao, "info" | "success" | "warning" | "destructive"> = {
  scheduled: "info",
  completed: "success",
  no_show: "warning",
  cancelled: "destructive",
};

/** "08:00:00" + 50 → "08:50" */
function fim(start: string, dur: number): string {
  const [h, m] = start.split(":").map(Number);
  const total = h * 60 + m + dur;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

export function ItemAgendamento({
  ag,
  plano,
  studioName = null,
}: {
  ag: AgendaDiaItem;
  plano: PlanoAula | null;
  studioName?: string | null;
}) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(false);
  const status = ag.status as StatusSessao;
  const inicio = ag.start_time.slice(0, 5);
  const cancelada = status === "cancelled";
  const linkWa = lembreteWhatsApp({
    phone: ag.students?.phone,
    nome: ag.students?.full_name ?? "Aluno",
    data: ag.appointment_date,
    hora: ag.start_time,
    studio: studioName,
  });

  async function mudarStatus(novo: StatusSessao) {
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
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border bg-card p-2 text-xs shadow-sm transition-colors",
        cancelada && "opacity-55",
      )}
    >
      {/* Info = trigger do modal (sem interativos aninhados) */}
      <ModalAgendamento
        ag={ag}
        plano={plano}
        studioName={studioName}
        trigger={
          <button
            type="button"
            className="min-w-0 flex-1 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
          >
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-semibold tabular-nums">{inicio}</span>
              <Badge variant={VARIANTE[status]} className="px-1.5 py-0 text-[10px]">
                {rotuloStatusSessao[status]}
              </Badge>
              {ag.temPlano ? (
                <span className="inline-flex items-center gap-0.5 text-primary">
                  <SparkleIcon className="size-3" weight="fill" />
                </span>
              ) : null}
            </div>
            <p className={cn("mt-0.5 truncate font-medium", cancelada && "line-through")}>
              {ag.students?.full_name ?? "Aluno"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {inicio}–{fim(ag.start_time, ag.duration_min)}
              {ag.notes ? ` · ${ag.notes}` : ""}
            </p>
          </button>
        }
      />

      {/* Dropdown — irmão, fora do trigger */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon"
            variant="ghost"
            className="size-6 shrink-0"
            aria-label="Ações da aula"
            disabled={ocupado}
          >
            <DotsThreeVerticalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {status !== "completed" ? (
            <DropdownMenuItem onSelect={() => mudarStatus("completed")}>
              <CheckCircleIcon className="size-4 text-success" /> Marcar realizada
            </DropdownMenuItem>
          ) : null}
          {status !== "no_show" ? (
            <DropdownMenuItem onSelect={() => mudarStatus("no_show")}>
              <XCircleIcon className="size-4 text-warning-foreground" /> Marcar falta
            </DropdownMenuItem>
          ) : null}
          {status !== "cancelled" ? (
            <DropdownMenuItem onSelect={() => mudarStatus("cancelled")}>
              <ProhibitIcon className="size-4" /> Cancelar
            </DropdownMenuItem>
          ) : null}
          {status === "cancelled" || status === "no_show" ? (
            <DropdownMenuItem onSelect={() => mudarStatus("scheduled")}>
              Reagendar (voltar a agendada)
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() =>
              router.push(`/alunos/${ag.student_id}/sessoes/nova?agendamento=${ag.id}`)
            }
          >
            <ClipboardTextIcon className="size-4" /> Registrar aula
          </DropdownMenuItem>
          {linkWa && !cancelada ? (
            <DropdownMenuItem onSelect={() => window.open(linkWa, "_blank", "noopener,noreferrer")}>
              <WhatsappLogoIcon className="size-4 text-success" weight="fill" /> Lembrar no WhatsApp
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
  );
}
