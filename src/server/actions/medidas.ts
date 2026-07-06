"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type MedidaInput, medidaSchema } from "@/lib/validators/medida";
import type { ActionResult } from "@/server/actions/result";
import { requireTenant } from "@/server/auth";

const num = (v?: number) => (typeof v === "number" ? v : undefined);

export async function registrarMedida(
  studentId: string,
  input: MedidaInput,
): Promise<ActionResult> {
  const ctx = await requireTenant();
  const p = medidaSchema.safeParse(input);
  if (!p.success) return { ok: false, erro: p.error.issues[0]?.message ?? "Dados inválidos." };
  const d = p.data;
  const supabase = await createClient();

  const circumferences: Record<string, number> = {};
  if (num(d.waistCm) != null) circumferences.waist_cm = d.waistCm as number;
  if (num(d.hipCm) != null) circumferences.hip_cm = d.hipCm as number;
  if (num(d.rightArmCm) != null) circumferences.right_arm_cm = d.rightArmCm as number;
  if (num(d.rightThighCm) != null) circumferences.right_thigh_cm = d.rightThighCm as number;

  const flexibility: Record<string, number> = {};
  if (num(d.sitAndReachCm) != null) flexibility.sit_and_reach_cm = d.sitAndReachCm as number;

  // 1 medição por dia (unique tenant_id, student_id, measured_at) → upsert.
  const { error } = await supabase.from("body_measurements").upsert(
    {
      tenant_id: ctx.tenant.id,
      student_id: studentId,
      measured_at: d.measuredAt,
      weight_kg: d.weightKg ?? null,
      height_cm: d.heightCm ?? null,
      circumferences,
      flexibility,
      notes: d.notes?.trim() || null,
    },
    { onConflict: "tenant_id,student_id,measured_at" },
  );
  if (error) return { ok: false, erro: "Não foi possível salvar a medida." };

  revalidatePath(`/alunos/${studentId}/evolucao`);
  return { ok: true, data: null };
}

export async function excluirMedida(id: string, studentId: string): Promise<ActionResult> {
  await requireTenant();
  const supabase = await createClient();
  const { error } = await supabase.from("body_measurements").delete().eq("id", id);
  if (error) return { ok: false, erro: "Não foi possível excluir a medida." };

  revalidatePath(`/alunos/${studentId}/evolucao`);
  return { ok: true, data: null };
}
