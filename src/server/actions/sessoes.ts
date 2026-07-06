"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type SessaoInput, sessaoSchema } from "@/lib/validators/sessao";
import type { ActionResult } from "@/server/actions/result";
import { requireTenant } from "@/server/auth";

const nn = (v?: string | null) => {
  const t = v?.trim();
  return t ? t : null;
};

export async function criarSessao(
  studentId: string,
  input: SessaoInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireTenant();
  const p = sessaoSchema.safeParse(input);
  if (!p.success) return { ok: false, erro: p.error.issues[0]?.message ?? "Dados inválidos." };
  const d = p.data;
  const supabase = await createClient();

  const { data: sessao, error } = await supabase
    .from("sessions")
    .insert({
      tenant_id: ctx.tenant.id,
      student_id: studentId,
      created_by: ctx.user.id,
      session_date: d.sessionDate,
      duration_min: d.durationMin ?? null,
      status: d.status,
      pain_level_pre: d.painLevelPre ?? null,
      pain_level_post: d.painLevelPost ?? null,
      focus: nn(d.focus),
      notes: nn(d.notes),
    })
    .select("id")
    .single();
  if (error || !sessao) return { ok: false, erro: "Não foi possível salvar a sessão." };

  if (d.exercises.length) {
    const rows = d.exercises.map((ex, i) => ({
      tenant_id: ctx.tenant.id,
      session_id: sessao.id,
      exercise_id: ex.exerciseId,
      order_index: i,
      sets: ex.sets ?? null,
      reps: ex.reps ?? null,
      load_springs: nn(ex.loadSprings),
      resistance_level: ex.resistanceLevel ?? null,
      difficulty_felt: ex.difficultyFelt ?? null,
      quality_rating: ex.qualityRating ?? null,
      notes: nn(ex.notes),
    }));
    const { error: exError } = await supabase.from("session_exercises").insert(rows);
    if (exError) {
      // desfaz a sessão para não deixar registro sem exercícios
      await supabase.from("sessions").delete().eq("id", sessao.id);
      return { ok: false, erro: "Não foi possível salvar os exercícios da sessão." };
    }
  }

  revalidatePath(`/alunos/${studentId}/sessoes`);
  revalidatePath("/dashboard");
  return { ok: true, data: { id: sessao.id } };
}

export async function excluirSessao(id: string, studentId: string): Promise<ActionResult> {
  await requireTenant();
  const supabase = await createClient();
  const { error } = await supabase
    .from("sessions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) return { ok: false, erro: "Não foi possível excluir a sessão." };

  revalidatePath(`/alunos/${studentId}/sessoes`);
  revalidatePath("/dashboard");
  return { ok: true, data: null };
}
