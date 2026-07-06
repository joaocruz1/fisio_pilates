"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type AvaliacaoInput, avaliacaoSchema } from "@/lib/validators/avaliacao";
import type { ActionResult } from "@/server/actions/result";
import { requireTenant } from "@/server/auth";

const nn = (v?: string | null) => {
  const t = v?.trim();
  return t ? t : null;
};

function colunas(d: AvaliacaoInput) {
  return {
    kind: d.kind,
    assessed_at: d.assessedAt,
    main_complaint: nn(d.mainComplaint),
    clinical_diagnosis: nn(d.clinicalDiagnosis),
    goals: d.goals.length ? d.goals : null,
    contraindications: d.contraindications.length ? d.contraindications : null,
    pain_level_initial: d.painLevelInitial ?? null,
    anamnesis: d.anamnesis,
    postural_assessment: d.posturalAssessment,
    physical_tests: d.physicalTests,
    notes: nn(d.notes),
  };
}

export async function criarAvaliacao(
  studentId: string,
  input: AvaliacaoInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireTenant();
  const p = avaliacaoSchema.safeParse(input);
  if (!p.success) return { ok: false, erro: p.error.issues[0]?.message ?? "Dados inválidos." };
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("assessments")
    .insert({
      tenant_id: ctx.tenant.id,
      student_id: studentId,
      created_by: ctx.user.id,
      ...colunas(p.data),
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, erro: "Não foi possível salvar a avaliação." };

  revalidatePath(`/alunos/${studentId}/avaliacao`);
  return { ok: true, data: { id: data.id } };
}

export async function atualizarAvaliacao(
  id: string,
  studentId: string,
  input: AvaliacaoInput,
): Promise<ActionResult> {
  await requireTenant();
  const p = avaliacaoSchema.safeParse(input);
  if (!p.success) return { ok: false, erro: p.error.issues[0]?.message ?? "Dados inválidos." };
  const supabase = await createClient();

  const { error } = await supabase
    .from("assessments")
    .update(colunas(p.data))
    .eq("id", id)
    .is("deleted_at", null);
  if (error) return { ok: false, erro: "Não foi possível salvar as alterações." };

  revalidatePath(`/alunos/${studentId}/avaliacao`);
  revalidatePath(`/alunos/${studentId}/avaliacao/${id}`);
  return { ok: true, data: null };
}

export async function excluirAvaliacao(id: string, studentId: string): Promise<ActionResult> {
  await requireTenant();
  const supabase = await createClient();
  const { error } = await supabase
    .from("assessments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) return { ok: false, erro: "Não foi possível excluir a avaliação." };

  revalidatePath(`/alunos/${studentId}/avaliacao`);
  return { ok: true, data: null };
}
