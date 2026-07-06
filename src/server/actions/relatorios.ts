"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/server/actions/result";
import { requireTenant } from "@/server/auth";

/** Aprovação humana do relatório (rascunho → aprovado). */
export async function aprovarRelatorio(id: string, studentId: string): Promise<ActionResult> {
  await requireTenant();
  const supabase = await createClient();
  const { error } = await supabase
    .from("ai_reports")
    .update({ approved_at: new Date().toISOString() })
    .eq("id", id)
    .eq("status", "completed");
  if (error) return { ok: false, erro: "Não foi possível aprovar o relatório." };
  revalidatePath(`/alunos/${studentId}/evolucao`);
  return { ok: true, data: null };
}

export async function excluirRelatorio(id: string, studentId: string): Promise<ActionResult> {
  await requireTenant();
  const supabase = await createClient();
  const { error } = await supabase.from("ai_reports").delete().eq("id", id);
  if (error) return { ok: false, erro: "Não foi possível excluir o relatório." };
  revalidatePath(`/alunos/${studentId}/evolucao`);
  return { ok: true, data: null };
}
