"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { assertLimiteAlunos, LimiteExcedidoError } from "@/lib/billing/limites";
import { STATUS_ALUNO, type StatusAluno } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import {
  type AtualizarAlunoInput,
  atualizarAlunoSchema,
  type CriarAlunoInput,
  criarAlunoSchema,
} from "@/lib/validators/aluno";
import type { ActionResult } from "@/server/actions/result";
import { requireTenant } from "@/server/auth";
import { registrarAuditoria } from "@/server/services/audit";

const nn = (v?: string | null) => {
  const t = v?.trim();
  return t ? t : null;
};

export async function criarAluno(input: CriarAlunoInput): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireTenant();

  // T8: limite de alunas por plano.
  try {
    await assertLimiteAlunos(ctx.tenant.id);
  } catch (err) {
    if (err instanceof LimiteExcedidoError) return { ok: false, erro: err.motivo };
    throw err;
  }

  const parsed = criarAlunoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("students")
    .insert({
      tenant_id: ctx.tenant.id,
      full_name: d.fullName,
      birth_date: nn(d.birthDate),
      sex: d.sex ?? null,
      cpf: nn(d.cpf),
      phone: nn(d.phone),
      email: nn(d.email),
      occupation: nn(d.occupation),
      emergency_contact_name: nn(d.emergencyContactName),
      emergency_contact_phone: nn(d.emergencyContactPhone),
      general_notes: nn(d.generalNotes),
      consent_signed_at: d.consent ? new Date().toISOString() : null,
      consent_version: d.consent ? "1.0" : null,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, erro: "Não foi possível salvar o aluno. Tente novamente." };
  }

  await registrarAuditoria(supabase, {
    tenantId: ctx.tenant.id,
    userId: ctx.user.id,
    action: "student.create",
    entityType: "student",
    entityId: data.id,
  });

  revalidatePath("/alunos");
  return { ok: true, data: { id: data.id } };
}

export async function atualizarAluno(
  id: string,
  input: AtualizarAlunoInput,
): Promise<ActionResult> {
  await requireTenant();

  const parsed = atualizarAlunoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;
  const supabase = await createClient();

  // tenant_id nunca vem do form; a RLS restringe o UPDATE ao tenant da sessão.
  const { error } = await supabase
    .from("students")
    .update({
      full_name: d.fullName,
      birth_date: nn(d.birthDate),
      sex: d.sex ?? null,
      cpf: nn(d.cpf),
      phone: nn(d.phone),
      email: nn(d.email),
      occupation: nn(d.occupation),
      emergency_contact_name: nn(d.emergencyContactName),
      emergency_contact_phone: nn(d.emergencyContactPhone),
      general_notes: nn(d.generalNotes),
    })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) return { ok: false, erro: "Não foi possível salvar as alterações. Tente novamente." };

  revalidatePath("/alunos");
  revalidatePath(`/alunos/${id}`);
  return { ok: true, data: null };
}

export async function alterarStatusAluno(id: string, status: StatusAluno): Promise<ActionResult> {
  await requireTenant();
  if (!STATUS_ALUNO.includes(status)) return { ok: false, erro: "Status inválido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("students")
    .update({ status })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) return { ok: false, erro: "Não foi possível atualizar o status. Tente novamente." };

  revalidatePath("/alunos");
  revalidatePath(`/alunos/${id}`);
  return { ok: true, data: null };
}

export async function excluirAluno(id: string): Promise<ActionResult> {
  const ctx = await requireTenant();
  const supabase = await createClient();

  // Soft delete (fase 1 da exclusão em 2 fases — ver 07-lgpd-seguranca.md).
  const { error } = await supabase
    .from("students")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) return { ok: false, erro: "Não foi possível excluir o aluno. Tente novamente." };

  await registrarAuditoria(supabase, {
    tenantId: ctx.tenant.id,
    userId: ctx.user.id,
    action: "student.delete",
    entityType: "student",
    entityId: id,
  });

  revalidatePath("/alunos");
  return { ok: true, data: null };
}
