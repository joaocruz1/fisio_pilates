"use client";

import { SparkleIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { type EstadoAula, ProgressoAula } from "@/components/sessoes/progresso-aula";
import { Button } from "@/components/ui/button";

type Evento =
  | { type: "stage"; stage: EstadoAula["stage"] }
  | { type: "partial"; foco: string; exercicios: string[] }
  | { type: "done"; id: string; cached?: boolean }
  | { type: "error"; erro: string };

/** Gera o plano da próxima aula com IA (streaming) e leva para a Nova Aula pré-preenchida. */
export function GerarProximaAula({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoAula | null>(null);
  const gerando = estado !== null;

  async function gerar() {
    setEstado({ stage: "dados", foco: "", exercicios: [] });
    try {
      const res = await fetch("/api/ai/next-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      });

      // Erros antes do stream (quota/validação) vêm como JSON.
      if (!res.ok || !res.body) {
        const j = (await res.json().catch(() => ({}))) as { erro?: string };
        toast.error(j.erro ?? "Não foi possível gerar o plano.");
        setEstado(null);
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
            setEstado((s) => ({ foco: "", exercicios: [], ...(s ?? {}), stage: evt.stage }));
          } else if (evt.type === "partial") {
            setEstado({ stage: "gerando", foco: evt.foco, exercicios: evt.exercicios });
          } else if (evt.type === "done") {
            doneId = evt.id;
          } else if (evt.type === "error") {
            toast.error(evt.erro);
            setEstado(null);
            return;
          }
        }
      }

      if (doneId) {
        toast.success("Plano da próxima aula gerado.");
        router.push(`/alunos/${studentId}/sessoes/nova?plano=${doneId}`);
      } else {
        setEstado(null);
        toast.error("Não foi possível gerar o plano.");
      }
    } catch {
      toast.error("Não foi possível gerar o plano.");
      setEstado(null);
    }
  }

  return (
    <>
      <Button size="sm" variant="outline" onClick={gerar} disabled={gerando}>
        <SparkleIcon className="size-4" />
        {gerando ? "Gerando…" : "Gerar próxima aula com IA"}
      </Button>

      {estado ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md">
            <ProgressoAula estado={estado} />
          </div>
        </div>
      ) : null}
    </>
  );
}
