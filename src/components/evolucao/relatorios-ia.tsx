"use client";

import { SparkleIcon, TrashIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
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
  if (r.approved_at) return <Badge variant="default">Aprovado</Badge>;
  return <Badge variant="secondary">Rascunho</Badge>;
}

function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-semibold">{titulo}</h4>
      <div className="text-sm text-muted-foreground">{children}</div>
    </div>
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
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Relatório de evolução</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">{AVISO_IA}</p>
          <Secao titulo="Resumo">{r.resumo_executivo}</Secao>
          <Secao titulo="Progressão de exercícios">
            {r.evolucao_pilates?.progressao_exercicios}
          </Secao>
          <Secao titulo="Carga e complexidade">{r.evolucao_pilates?.carga_e_complexidade}</Secao>
          <Secao titulo="Aderência">{r.evolucao_pilates?.aderencia}</Secao>
          <Secao titulo="Medidas e tendências">{r.evolucao_corporal?.medidas_e_tendencias}</Secao>
          <Secao titulo="Dor e queixas">{r.evolucao_corporal?.dor_e_queixas}</Secao>
          {r.evolucao_corporal?.observacoes_posturais ? (
            <Secao titulo="Observações posturais">
              {r.evolucao_corporal.observacoes_posturais}
            </Secao>
          ) : null}
          {r.pontos_de_atencao?.length ? (
            <Secao titulo="Pontos de atenção">
              <ul className="list-disc pl-5">
                {r.pontos_de_atencao.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            </Secao>
          ) : null}
          {r.sugestoes_para_proximas_sessoes?.length ? (
            <Secao titulo="Sugestões para as próximas sessões">
              <ul className="list-disc pl-5">
                {r.sugestoes_para_proximas_sessoes.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            </Secao>
          ) : null}
          {r.dados_faltantes?.length ? (
            <Secao titulo="Dados sem registro">
              <ul className="list-disc pl-5">
                {r.dados_faltantes.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </Secao>
          ) : null}
          {!report.approved_at ? (
            <Button onClick={aprovar}>Revisar e aprovar</Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Aprovado em {formatarData(report.approved_at)}.
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function RelatoriosIA({ studentId, reports }: { studentId: string; reports: Report[] }) {
  const router = useRouter();
  const [gerando, setGerando] = useState(false);

  async function gerar() {
    setGerando(true);
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
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.erro ?? "Não foi possível gerar a análise.");
        return;
      }
      toast.success(json.cached ? "Relatório já existente carregado." : "Relatório gerado.");
      router.refresh();
    } catch {
      toast.error("Não foi possível gerar a análise.");
    } finally {
      setGerando(false);
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

      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhum relatório gerado ainda.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {reports.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-3 rounded-lg border p-3"
            >
              <div className="flex items-center gap-2">
                <span className="text-sm">{formatarData(r.created_at.slice(0, 10))}</span>
                {statusBadge(r)}
              </div>
              <div className="flex items-center gap-1">
                {r.status === "completed" ? (
                  <VerRelatorio report={r} studentId={studentId} />
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
      )}
    </section>
  );
}
