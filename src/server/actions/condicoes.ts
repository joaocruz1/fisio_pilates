"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type CondicaoInput, condicaoSchema } from "@/lib/validators/condicao";
import type { ActionResult } from "@/server/actions/result";
import { requireTenant } from "@/server/auth";

const nn = (v?: string | null) => {
  const t = v?.trim();
  return t ? t : null;
};

export async function criarCondicao(
  studentId: string,
  input: CondicaoInput,
): Promise<ActionResult> {
  const ctx = await requireTenant();
  const p = condicaoSchema.safeParse(input);
  if (!p.success) return { ok: false, erro: p.error.issues[0]?.message ?? "Dados inválidos." };
  const d = p.data;
  const supabase = await createClient();

  const { error } = await supabase.from("student_conditions").insert({
    tenant_id: ctx.tenant.id,
    student_id: studentId,
    name: d.name,
    cid_code: nn(d.cidCode),
    status: d.status,
    severity: d.severity ?? null,
    notes: nn(d.notes),
    diagnosed_at: nn(d.diagnosedAt),
  });
  if (error) return { ok: false, erro: "Não foi possível salvar a condição." };

  revalidatePath(`/alunos/${studentId}/avaliacao`);
  return { ok: true, data: null };
}

export async function atualizarCondicao(
  id: string,
  studentId: string,
  input: CondicaoInput,
): Promise<ActionResult> {
  await requireTenant();
  const p = condicaoSchema.safeParse(input);
  if (!p.success) return { ok: false, erro: p.error.issues[0]?.message ?? "Dados inválidos." };
  const d = p.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("student_conditions")
    .update({
      name: d.name,
      cid_code: nn(d.cidCode),
      status: d.status,
      severity: d.severity ?? null,
      notes: nn(d.notes),
      diagnosed_at: nn(d.diagnosedAt),
    })
    .eq("id", id);
  if (error) return { ok: false, erro: "Não foi possível salvar a condição." };

  revalidatePath(`/alunos/${studentId}/avaliacao`);
  return { ok: true, data: null };
}

export async function excluirCondicao(id: string, studentId: string): Promise<ActionResult> {
  await requireTenant();
  const supabase = await createClient();
  const { error } = await supabase.from("student_conditions").delete().eq("id", id);
  if (error) return { ok: false, erro: "Não foi possível excluir a condição." };

  revalidatePath(`/alunos/${studentId}/avaliacao`);
  return { ok: true, data: null };
}
