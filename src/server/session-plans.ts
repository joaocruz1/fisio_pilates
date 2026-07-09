import "server-only";
import type { UltimaSessao } from "@/components/sessoes/sessao-form";
import type { PlanoAula } from "@/lib/ai/schemas/plano-aula";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/server/auth";
import { listExercises } from "@/server/exercises";

/**
 * Converte um plano de aula gerado pela IA (ai_reports.structured, report_type
 * 'next_session') num pré-preenchimento para o SessaoForm, mapeando os nomes de
 * exercício para os ids do catálogo. Retorna os não encontrados para aviso.
 */
export async function getPlanoPrefill(reportId: string): Promise<{
  prefill: UltimaSessao;
  naoEncontrados: string[];
  justificativa: string;
  avisos: string[];
  plano: PlanoAula;
} | null> {
  await requireTenant();
  const supabase = await createClient();

  const { data } = await supabase
    .from("ai_reports")
    .select("structured, report_type, status")
    .eq("id", reportId)
    .maybeSingle();
  if (data?.report_type !== "next_session" || data.status !== "completed") return null;

  const plano = data.structured as unknown as PlanoAula;
  const catalogo = await listExercises();
  const porNome = new Map(catalogo.map((e) => [e.name.toLowerCase(), e.id]));

  const exercises: UltimaSessao["exercises"] = [];
  const naoEncontrados: string[] = [];
  for (const ex of plano.exercicios ?? []) {
    const alvo = ex.nome.trim().toLowerCase();
    const id =
      porNome.get(alvo) ?? catalogo.find((e) => e.name.toLowerCase().includes(alvo))?.id ?? null;
    if (!id) {
      naoEncontrados.push(ex.nome);
      continue;
    }
    exercises.push({
      exerciseId: id,
      sets: ex.series,
      reps: ex.reps,
      loadSprings: ex.carga_molas,
      resistanceLevel: ex.nivel,
    });
  }

  return {
    prefill: { focus: plano.foco, exercises },
    naoEncontrados,
    justificativa: plano.justificativa ?? "",
    avisos: plano.avisos_para_sessao ?? [],
    plano,
  };
}
