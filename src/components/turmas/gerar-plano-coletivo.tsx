"use client";

import { SparkleIcon, SpinnerIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Evento =
  | { type: "stage"; stage: "dados" | "base" | "gerando" }
  | {
      type: "partial";
      foco: string;
      blocos: {
        ordem: number | null;
        atribuicoes: { aluno: string; estacao: string; exercicio: string }[];
      }[];
    }
  | { type: "done"; id: string; cached?: boolean; avisos?: string[] }
  | { type: "error"; erro: string };

const ETAPAS: { key: "dados" | "base" | "gerando"; label: string }[] = [
  { key: "dados", label: "Reunindo o histórico das alunas" },
  { key: "base", label: "Consultando a base de conhecimento" },
  { key: "gerando", label: "Montando o plano com rotação" },
];

/**
 * Gera o plano da aula coletiva com IA (streaming). Por padrão redireciona à
 * página do plano; se receber `onConcluido` (uso no modal da agenda), fica no
 * contexto atual e apenas atualiza os dados via `router.refresh()`.
 */
export function GerarPlanoColetivo({
  turmaId,
  sessionId,
  onConcluido,
}: {
  turmaId: string;
  sessionId: string;
  onConcluido?: () => void;
}) {
  const router = useRouter();
  const [stage, setStage] = useState<"dados" | "base" | "gerando" | null>(null);
  const [resumo, setResumo] = useState<string>("");
  const gerando = stage !== null;

  async function gerar() {
    setStage("dados");
    setResumo("");
    try {
      const res = await fetch("/api/ai/group-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classSessionId: sessionId }),
      });

      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => ({}))) as { erro?: string };
        toast.error(j.erro ?? "Não foi possível gerar o plano.");
        setStage(null);
        return;
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      let doneId: string | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        const linhas = buf.split("\n");
        buf = linhas.pop() ?? "";
        for (const linha of linhas) {
          if (!linha.trim()) continue;
          const evt = JSON.parse(linha) as Evento;
          if (evt.type === "stage") {
            setStage(evt.stage);
          } else if (evt.type === "partial") {
            setStage("gerando");
            const totalAttr = evt.blocos.reduce((s, b) => s + b.atribuicoes.length, 0);
            setResumo(
              [evt.foco, `${evt.blocos.length} bloco(s) · ${totalAttr} atribuição(ões)`]
                .filter(Boolean)
                .join(" — "),
            );
          } else if (evt.type === "done") {
            doneId = evt.id;
            if (evt.avisos?.length) {
              toast.warning(`Plano gerado com avisos: ${evt.avisos.join(" ")}`);
            }
          } else if (evt.type === "error") {
            toast.error(evt.erro);
            setStage(null);
            // A rota pode ter linkado o plano mesmo em falha de rotação (revisível).
            router.refresh();
            return;
          }
        }
      }

      if (doneId) {
        toast.success("Plano da aula coletiva gerado.");
        if (onConcluido) {
          onConcluido();
          router.refresh();
        } else {
          router.push(`/turmas/${turmaId}/aulas/${sessionId}/plano`);
          router.refresh();
        }
      } else {
        setStage(null);
        toast.error("Não foi possível gerar o plano.");
      }
    } catch {
      toast.error("Não foi possível gerar o plano.");
      setStage(null);
    }
  }

  if (gerando) {
    const atual = ETAPAS.findIndex((e) => e.key === stage);
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-2xl border border-primary/20 bg-card p-5 shadow-lg">
          <div className="mb-3 flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-full bg-brand-gradient text-primary-foreground">
              <SparkleIcon className="size-4" weight="fill" />
            </span>
            <div>
              <p className="font-heading text-sm font-semibold">Gerando o plano da aula coletiva</p>
              <p className="text-xs text-muted-foreground">Rotação de aparelhos entre as alunas</p>
            </div>
          </div>
          <ul className="flex flex-col gap-1">
            {ETAPAS.map((etapa, i) => {
              const active = i === atual;
              const done = i < atual;
              return (
                <li key={etapa.key} className="flex items-center gap-2.5 rounded-lg px-1 py-1.5">
                  {done ? (
                    <span className="text-success">✓</span>
                  ) : active ? (
                    <SpinnerIcon className="size-5 animate-spin text-primary" />
                  ) : (
                    <span className="size-5 rounded-full border border-muted-foreground/30" />
                  )}
                  <span
                    className={
                      active
                        ? "text-sm font-medium text-foreground"
                        : done
                          ? "text-sm text-muted-foreground line-through"
                          : "text-sm text-muted-foreground/60"
                    }
                  >
                    {etapa.label}
                  </span>
                </li>
              );
            })}
          </ul>
          {resumo ? <p className="mt-3 text-xs text-muted-foreground">{resumo}</p> : null}
        </div>
      </div>
    );
  }

  return (
    <Button size="sm" variant="outline" onClick={gerar}>
      <SparkleIcon className="size-4" /> Gerar plano com IA
    </Button>
  );
}
