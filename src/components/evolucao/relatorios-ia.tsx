"use client";

import type { Icon } from "@phosphor-icons/react";
import {
  ActivityIcon,
  BarbellIcon,
  CheckCircleIcon,
  FilePdfIcon,
  HeartbeatIcon,
  InfoIcon,
  ListChecksIcon,
  PersonSimpleIcon,
  RulerIcon,
  SparkleIcon,
  TrashIcon,
  WarningIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  type EstadoRelatorio,
  ProgressoRelatorio,
} from "@/components/evolucao/progresso-relatorio";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { AVISO_IA, type Relatorio } from "@/lib/ai/schemas/relatorio";
import { textos } from "@/lib/textos";
import { formatarData } from "@/lib/utils";
import { aprovarRelatorio, excluirRelatorio } from "@/server/actions/relatorios";
import type { Report } from "@/server/reports";

function statusBadge(r: Report) {
  if (r.status === "failed") return <Badge variant="destructive">Erro</Badge>;
  if (r.status === "processing") return <Badge variant="secondary">Gerando…</Badge>;
  if (r.approved_at) return <Badge variant="success">Aprovado</Badge>;
  return <Badge variant="warning">Rascunho</Badge>;
}

/** Seção do relatório com ícone colorido e texto. */
function Secao({
  icon: Icon,
  titulo,
  children,
  cor = "text-primary",
}: {
  icon: Icon;
  titulo: string;
  children: React.ReactNode;
  cor?: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
        <Icon className={`size-4 ${cor}`} weight="fill" />
      </span>
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-semibold text-foreground">{titulo}</h4>
        <div className="mt-0.5 text-sm text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

/** Lista de itens com marcador (bullets coloridos). */
function ItemLista({ itens, icon: Icon, cor }: { itens: string[]; icon: Icon; cor: string }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {itens.map((t) => (
        <li key={t} className="flex items-start gap-2">
          <Icon className={`mt-0.5 size-3.5 shrink-0 ${cor}`} weight="fill" />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

function VerRelatorio({ report, studentId }: { report: Report; studentId: string }) {
  const router = useRouter();
  const r = report.structured as unknown as Relatorio;

  async function aprovar() {
    const res = await aprovarRelatorio(report.id, studentId);
    if (res.ok) {
      toast.success("Relatório aprovado.");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Ver
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[88vh] gap-0 overflow-hidden p-0 sm:max-w-2xl">
        {/* Cabeçalho com gradiente */}
        <DialogHeader className="bg-brand-gradient px-5 py-4 text-primary-foreground">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary-foreground/80">
            <SparkleIcon className="size-4" weight="fill" /> Relatório de evolução
          </div>
          <DialogTitle className="font-heading text-xl font-semibold text-primary-foreground">
            {formatarData(report.created_at.slice(0, 10))}
          </DialogTitle>
        </DialogHeader>

        <div className="flex max-h-[calc(88vh-5.5rem)] flex-col gap-5 overflow-y-auto p-5">
          {/* Resumo em destaque */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-primary">
              Resumo executivo
            </p>
            <p className="text-sm text-foreground/90">{r.resumo_executivo}</p>
          </div>

          {/* Evolução no Pilates */}
          <div className="flex flex-col gap-4">
            <h3 className="font-heading text-sm font-semibold text-foreground">
              Evolução no Pilates
            </h3>
            <Secao icon={BarbellIcon} titulo="Progressão de exercícios">
              {r.evolucao_pilates?.progressao_exercicios}
            </Secao>
            <Secao icon={ActivityIcon} titulo="Carga e complexidade" cor="text-info">
              {r.evolucao_pilates?.carga_e_complexidade}
            </Secao>
            <Secao icon={CheckCircleIcon} titulo="Aderência" cor="text-success">
              {r.evolucao_pilates?.aderencia}
            </Secao>
          </div>

          <hr className="border-border" />

          {/* Evolução corporal */}
          <div className="flex flex-col gap-4">
            <h3 className="font-heading text-sm font-semibold text-foreground">
              Evolução corporal
            </h3>
            <Secao icon={RulerIcon} titulo="Medidas e tendências" cor="text-info">
              {r.evolucao_corporal?.medidas_e_tendencias}
            </Secao>
            <Secao icon={HeartbeatIcon} titulo="Dor e queixas" cor="text-destructive">
              {r.evolucao_corporal?.dor_e_queixas}
            </Secao>
            {r.evolucao_corporal?.observacoes_posturais ? (
              <Secao icon={PersonSimpleIcon} titulo="Observações posturais">
                {r.evolucao_corporal.observacoes_posturais}
              </Secao>
            ) : null}
          </div>

          {/* Pontos de atenção */}
          {r.pontos_de_atencao?.length ? (
            <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-warning-foreground">
                <WarningIcon className="size-4" weight="fill" /> Pontos de atenção
              </p>
              <ItemLista
                itens={r.pontos_de_atencao}
                icon={WarningIcon}
                cor="text-warning-foreground"
              />
            </div>
          ) : null}

          {/* Sugestões */}
          {r.sugestoes_para_proximas_sessoes?.length ? (
            <div className="rounded-xl border border-success/30 bg-success/5 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-success">
                <ListChecksIcon className="size-4" weight="fill" /> Sugestões para as próximas aulas
              </p>
              <ItemLista
                itens={r.sugestoes_para_proximas_sessoes}
                icon={CheckCircleIcon}
                cor="text-success"
              />
            </div>
          ) : null}

          {/* Dados faltantes */}
          {r.dados_faltantes?.length ? (
            <Secao icon={InfoIcon} titulo="Dados sem registro" cor="text-muted-foreground">
              <ItemLista itens={r.dados_faltantes} icon={InfoIcon} cor="text-muted-foreground/60" />
            </Secao>
          ) : null}

          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">{AVISO_IA}</p>

          <Button asChild variant="outline" className="w-full">
            <Link href={`/imprimir/relatorio/${report.id}`} target="_blank">
              <FilePdfIcon className="size-4" /> Baixar PDF para a aluna
            </Link>
          </Button>

          {!report.approved_at ? (
            <Button onClick={aprovar} className="w-full">
              <CheckCircleIcon className="size-4" weight="fill" /> Revisar e aprovar
            </Button>
          ) : (
            <p className="flex items-center justify-center gap-1.5 text-sm text-success">
              <CheckCircleIcon className="size-4" weight="fill" /> Aprovado em{" "}
              {formatarData(report.approved_at)}.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

type EventoRel =
  | { type: "stage"; stage: EstadoRelatorio["stage"] }
  | { type: "partial"; resumo: string }
  | { type: "done"; id: string; cached?: boolean; status?: string }
  | { type: "error"; erro: string };

export function RelatoriosIA({ studentId, reports }: { studentId: string; reports: Report[] }) {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoRelatorio | null>(null);
  const gerando = estado !== null;

  async function gerar() {
    setEstado({ stage: "dados", resumo: "" });
    try {
      const to = new Date().toISOString().slice(0, 10);
      const fromDate = new Date();
      fromDate.setMonth(fromDate.getMonth() - 6);
      const from = fromDate.toISOString().slice(0, 10);

      const res = await fetch("/api/ai/analyses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId, from, to, reportType: "full_evolution" }),
      });

      // Erros antes do stream (quota/validação) vêm como JSON.
      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => ({}))) as { erro?: string };
        toast.error(j.erro ?? "Não foi possível gerar a análise.");
        setEstado(null);
        return;
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let doneId: string | null = null;
      let cached = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const linhas = buf.split("\n");
        buf = linhas.pop() ?? "";
        for (const linha of linhas) {
          if (!linha.trim()) continue;
          const evt = JSON.parse(linha) as EventoRel;
          if (evt.type === "stage") {
            setEstado((s) => ({ resumo: "", ...(s ?? {}), stage: evt.stage }));
          } else if (evt.type === "partial") {
            setEstado((s) => ({ stage: "gerando", ...(s ?? {}), resumo: evt.resumo }));
          } else if (evt.type === "done") {
            doneId = evt.id;
            cached = evt.cached ?? false;
          } else if (evt.type === "error") {
            toast.error(evt.erro);
            setEstado(null);
            return;
          }
        }
      }

      if (doneId) {
        toast.success(cached ? "Relatório já existente carregado." : "Relatório gerado.");
        router.refresh();
      } else {
        toast.error("Não foi possível gerar a análise.");
      }
    } catch {
      toast.error("Não foi possível gerar a análise.");
    } finally {
      setEstado(null);
    }
  }

  async function excluir(id: string) {
    const res = await excluirRelatorio(id, studentId);
    if (res.ok) {
      toast.success("Relatório excluído.");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Relatórios com IA</h2>
        <Button size="sm" onClick={gerar} disabled={gerando}>
          <SparkleIcon className="size-4" />
          {gerando ? "Gerando…" : "Gerar análise com IA"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">{textos.ia.disclaimer}</p>

      {estado ? <ProgressoRelatorio estado={estado} /> : null}

      {reports.length === 0 && !gerando ? (
        <p className="text-sm text-muted-foreground">Nenhum relatório gerado ainda.</p>
      ) : reports.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {reports.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-xl border bg-card p-3 shadow-sm transition-colors hover:border-primary/30"
            >
              <div className="flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <SparkleIcon className="size-4" weight="fill" />
                </span>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">
                    {formatarData(r.created_at.slice(0, 10))}
                  </span>
                  <span className="text-xs text-muted-foreground">Análise de evolução</span>
                </div>
                {statusBadge(r)}
              </div>
              <div className="flex items-center gap-1">
                {r.status === "completed" ? (
                  <>
                    <VerRelatorio report={r} studentId={studentId} />
                    <Button asChild size="icon" variant="ghost" aria-label="Baixar PDF">
                      <Link href={`/imprimir/relatorio/${r.id}`} target="_blank">
                        <FilePdfIcon className="size-4" />
                      </Link>
                    </Button>
                  </>
                ) : null}
                <ConfirmDialog
                  title="Excluir este relatório?"
                  confirmLabel="Excluir"
                  destructive
                  onConfirm={() => excluir(r.id)}
                  trigger={
                    <Button size="icon" variant="ghost" aria-label="Excluir relatório">
                      <TrashIcon className="size-4" />
                    </Button>
                  }
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
