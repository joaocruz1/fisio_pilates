"use client";

import { PencilSimpleIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { PlanoColetivoEditor } from "@/components/turmas/plano-coletivo-editor";
import type { AlunaDoPlano, EstacaoDoPlano } from "@/components/turmas/plano-coletivo-view";
import { PlanoColetivoView } from "@/components/turmas/plano-coletivo-view";
import { Button } from "@/components/ui/button";
import type { PlanoAulaGrupo } from "@/lib/ai/schemas/plano-aula-grupo";

/**
 * Alterna entre visualização (só leitura) e edição do plano coletivo. Mantém
 * o `reportId` para salvar as edições via `salvarPlanoColetivo`.
 */
export function PlanoColetivoContainer({
  reportId,
  plano,
  alunos,
  estacoes,
}: {
  reportId: string;
  plano: PlanoAulaGrupo;
  alunos: AlunaDoPlano[];
  estacoes: EstacaoDoPlano[];
}) {
  const [editando, setEditando] = useState(false);
  const avisos = plano.avisos ?? [];

  if (editando) {
    return (
      <PlanoColetivoEditor
        reportId={reportId}
        plano={plano}
        alunos={alunos}
        estacoes={estacoes}
        onCancel={() => setEditando(false)}
      />
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <Button size="sm" variant="outline" onClick={() => setEditando(true)}>
          <PencilSimpleIcon className="size-4" /> Editar plano
        </Button>
      </div>
      <PlanoColetivoView plano={plano} alunos={alunos} estacoes={estacoes} avisos={avisos} />
    </div>
  );
}
