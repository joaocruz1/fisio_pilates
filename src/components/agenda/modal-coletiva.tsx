"use client";

import { ArrowUpRightIcon, SparkleIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { GerarPlanoColetivo } from "@/components/turmas/gerar-plano-coletivo";
import { PlanoColetivoView } from "@/components/turmas/plano-coletivo-view";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { rotuloStatusClassSession, type StatusClassSession } from "@/lib/labels";
import { cn } from "@/lib/utils";
import type { AgendaColetivaItem } from "@/server/agenda";
import type { DadosModalColetiva } from "@/server/turmas";

const VARIANTE_C: Record<StatusClassSession, "info" | "success" | "destructive"> = {
  scheduled: "info",
  completed: "success",
  cancelled: "destructive",
};

function fim(start: string, dur: number): string {
  const [h, m] = start.split(":").map(Number);
  const t = h * 60 + m + dur;
  return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

/**
 * Modal da aula coletiva na agenda: mostra a turma (alunas + foco) e o plano
 * de aula com rotação. Se ainda não há plano, gera dentro do próprio modal e
 * atualiza in-place via `router.refresh()` (o Dialog permanece aberto).
 */
export function ModalColetiva({
  turmaId,
  sessionId,
  item,
  dados,
  trigger,
}: {
  turmaId: string;
  sessionId: string;
  item: AgendaColetivaItem;
  dados: DadosModalColetiva;
  trigger: ReactNode;
}) {
  const router = useRouter();
  const status = item.status as StatusClassSession;
  const plano = dados.plano;
  const inicio = item.start_time.slice(0, 5);

  return (
    <Dialog>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-h-[88vh] gap-0 overflow-hidden p-0 sm:max-w-4xl">
        {/* Header */}
        <div className="flex flex-col gap-2 border-b bg-brand-gradient px-5 py-4 text-primary-foreground">
          <div className="flex items-center gap-2">
            <UsersThreeIcon className="size-4" weight="fill" />
            <span className="text-xs font-medium uppercase tracking-wide text-primary-foreground/80">
              Aula coletiva
            </span>
            <Badge
              variant={VARIANTE_C[status]}
              className="ml-auto bg-white/15 text-primary-foreground"
            >
              {rotuloStatusClassSession[status]}
            </Badge>
          </div>
          <DialogTitle className="font-heading text-lg font-semibold leading-tight">
            {item.turma?.name ?? "Turma"}
          </DialogTitle>
          <p className="text-sm text-primary-foreground/90">
            {format(parseISO(item.session_date), "EEEE, d 'de' MMMM", { locale: ptBR })} ·{" "}
            <span className="tabular-nums">
              {inicio}–{fim(item.start_time, item.duration_min)}
            </span>{" "}
            · {item.duration_min} min · {item.numAlunos} {item.numAlunos === 1 ? "aluna" : "alunas"}
            {item.focus ? ` · foco: ${item.focus}` : ""}
          </p>
        </div>

        {/* Corpo com scroll */}
        <div className="flex max-h-[calc(88vh-7rem)] flex-col gap-4 overflow-y-auto px-5 py-4">
          {/* Alunas */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Alunas
            </h3>
            {dados.alunas.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma aluna vinculada à turma.</p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {dados.alunas.map((a) => (
                  <li key={a.id} className="flex flex-wrap items-center gap-1.5 text-sm">
                    <span className="font-medium">{a.full_name}</span>
                    {a.conditions
                      .filter((c) => c.status === "active")
                      .slice(0, 3)
                      .map((c) => (
                        <span
                          key={c.name}
                          className="rounded-full bg-warning/15 px-2 py-0.5 text-[11px] text-warning-foreground"
                        >
                          {c.name}
                        </span>
                      ))}
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Plano */}
          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Plano de aula
            </h3>
            {!plano?.temPlano ? (
              <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed p-6 text-center">
                <span className="flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <SparkleIcon className="size-5" />
                </span>
                <p className="text-sm text-muted-foreground">
                  Ainda não há plano. Gere com a IA o plano coletivo com rotação.
                </p>
                <GerarPlanoColetivo
                  turmaId={turmaId}
                  sessionId={sessionId}
                  onConcluido={() => router.refresh()}
                />
              </div>
            ) : plano.status === "processing" ? (
              <p className="rounded-lg border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                Geração em andamento… recarregue em instantes.
              </p>
            ) : (
              <>
                {plano.status === "failed" && plano.errorMessage ? (
                  <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive-foreground">
                    <p className="font-medium">O plano tem problemas de rotação:</p>
                    <p className="mt-1 text-xs">{plano.errorMessage}</p>
                  </div>
                ) : null}
                {plano.plano ? (
                  <PlanoColetivoView
                    plano={plano.plano}
                    alunos={plano.alunos}
                    estacoes={plano.estacoes}
                    avisos={plano.plano.avisos ?? []}
                  />
                ) : (
                  <p className="rounded-lg border bg-muted/30 p-4 text-center text-sm text-muted-foreground">
                    Plano indisponível.
                  </p>
                )}
              </>
            )}
          </section>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center gap-2 border-t px-5 py-3">
          <Button asChild size="sm" variant="outline">
            <Link href={`/turmas/${turmaId}`}>
              <ArrowUpRightIcon className="size-4" /> Abrir turma
            </Link>
          </Button>
          {plano?.temPlano ? (
            <Button asChild size="sm" variant="ghost">
              <Link href={`/turmas/${turmaId}/aulas/${sessionId}/plano`}>Abrir plano (página)</Link>
            </Button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Reuso: envoltório para o chip da semana (trigger compacto). */
export function ChipColetiva({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <span
      className={cn(
        "flex items-center gap-1.5 rounded-md border border-primary/30 bg-primary/5 px-1.5 py-1 text-[11px] hover:bg-primary/10",
        className,
      )}
    >
      {children}
    </span>
  );
}
