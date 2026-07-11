"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  type AgendarClassSessionInput,
  agendarClassSessionSchema,
} from "@/lib/validators/class-session";
import {
  type AdicionarAlunoInput,
  type AtualizarTurmaInput,
  adicionarAlunoSchema,
  atualizarTurmaSchema,
  type CriarTurmaInput,
  criarTurmaSchema,
} from "@/lib/validators/turma";
import type { ActionResult } from "@/server/actions/result";
import { requireTenant } from "@/server/auth";
import { registrarAuditoria } from "@/server/services/audit";

const nn = (v?: string | null) => {
  const t = v?.trim();
  return t ? t : null;
};

export async function criarTurma(input: CriarTurmaInput): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireTenant();

  const parsed = criarTurmaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("class_groups")
    .insert({
      tenant_id: ctx.tenant.id,
      name: d.name,
      notes: nn(d.notes),
      default_duration_min: d.defaultDurationMin ?? 50,
      max_students: d.maxStudents ?? 6,
      weekday: d.weekday ?? null,
      start_time: d.startTime ?? null,
      status: d.status ?? "active",
      created_by: ctx.user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return { ok: false, erro: "Já existe uma turma com esse nome." };
    }
    return { ok: false, erro: "Não foi possível salvar a turma. Tente novamente." };
  }

  await registrarAuditoria(supabase, {
    tenantId: ctx.tenant.id,
    userId: ctx.user.id,
    action: "class_group.create",
    entityType: "class_group",
    entityId: data.id,
  });

  revalidatePath("/turmas");
  return { ok: true, data: { id: data.id } };
}

export async function atualizarTurma(
  id: string,
  input: AtualizarTurmaInput,
): Promise<ActionResult> {
  await requireTenant();

  const parsed = atualizarTurmaSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;
  const supabase = await createClient();

  const { error } = await supabase
    .from("class_groups")
    .update({
      name: d.name,
      notes: nn(d.notes),
      default_duration_min: d.defaultDurationMin ?? 50,
      max_students: d.maxStudents ?? 6,
      weekday: d.weekday ?? null,
      start_time: d.startTime ?? null,
      status: d.status ?? "active",
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, erro: "Já existe uma turma com esse nome." };
    }
    return { ok: false, erro: "Não foi possível salvar as alterações. Tente novamente." };
  }

  revalidatePath("/turmas");
  revalidatePath(`/turmas/${id}`);
  return { ok: true, data: null };
}

/** Arquiva (soft) a turma — preserva o histórico de ocorrências. */
export async function excluirTurma(id: string): Promise<ActionResult> {
  const ctx = await requireTenant();
  const supabase = await createClient();

  const { error } = await supabase.from("class_groups").update({ status: "archived" }).eq("id", id);
  if (error) return { ok: false, erro: "Não foi possível arquivar a turma. Tente novamente." };

  await registrarAuditoria(supabase, {
    tenantId: ctx.tenant.id,
    userId: ctx.user.id,
    action: "class_group.archive",
    entityType: "class_group",
    entityId: id,
  });

  revalidatePath("/turmas");
  revalidatePath(`/turmas/${id}`);
  return { ok: true, data: null };
}

export async function adicionarAlunoTurma(
  classGroupId: string,
  input: AdicionarAlunoInput,
): Promise<ActionResult> {
  const ctx = await requireTenant();
  const parsed = adicionarAlunoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const supabase = await createClient();

  const { error } = await supabase.from("class_group_students").insert({
    tenant_id: ctx.tenant.id,
    class_group_id: classGroupId,
    student_id: parsed.data.studentId,
    ordem: parsed.data.ordem ?? 0,
  });

  if (error) {
    if (error.code === "23505") return { ok: false, erro: "Aluno já está nesta turma." };
    return { ok: false, erro: "Não foi possível adicionar o aluno. Tente novamente." };
  }

  await registrarAuditoria(supabase, {
    tenantId: ctx.tenant.id,
    userId: ctx.user.id,
    action: "class_group_student.add",
    entityType: "class_group",
    entityId: classGroupId,
    metadata: { studentId: parsed.data.studentId },
  });

  revalidatePath(`/turmas/${classGroupId}`);
  return { ok: true, data: null };
}

export async function removerAlunoTurma(
  classGroupId: string,
  studentId: string,
): Promise<ActionResult> {
  const ctx = await requireTenant();
  const supabase = await createClient();

  const { error } = await supabase
    .from("class_group_students")
    .delete()
    .eq("class_group_id", classGroupId)
    .eq("student_id", studentId);

  if (error) return { ok: false, erro: "Não foi possível remover o aluno. Tente novamente." };

  await registrarAuditoria(supabase, {
    tenantId: ctx.tenant.id,
    userId: ctx.user.id,
    action: "class_group_student.remove",
    entityType: "class_group",
    entityId: classGroupId,
    metadata: { studentId },
  });

  revalidatePath(`/turmas/${classGroupId}`);
  return { ok: true, data: null };
}

export async function agendarClassSession(
  input: AgendarClassSessionInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireTenant();
  const parsed = agendarClassSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("class_sessions")
    .insert({
      tenant_id: ctx.tenant.id,
      class_group_id: d.classGroupId,
      session_date: d.sessionDate,
      start_time: d.startTime,
      duration_min: d.durationMin ?? 50,
      focus: nn(d.focus),
      created_by: ctx.user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return { ok: false, erro: "Já existe uma aula dessa turma neste dia e horário." };
    }
    return { ok: false, erro: "Não foi possível agendar a aula. Tente novamente." };
  }

  await registrarAuditoria(supabase, {
    tenantId: ctx.tenant.id,
    userId: ctx.user.id,
    action: "class_session.schedule",
    entityType: "class_session",
    entityId: data.id,
    metadata: { classGroupId: d.classGroupId, date: d.sessionDate },
  });

  revalidatePath(`/turmas/${d.classGroupId}`);
  revalidatePath("/agenda");
  return { ok: true, data: { id: data.id } };
}

export async function marcarClassSessionStatus(
  sessionId: string,
  classGroupId: string,
  status: "scheduled" | "completed" | "cancelled",
): Promise<ActionResult> {
  await requireTenant();
  const supabase = await createClient();

  const { error } = await supabase.from("class_sessions").update({ status }).eq("id", sessionId);

  if (error) return { ok: false, erro: "Não foi possível atualizar a aula. Tente novamente." };

  revalidatePath(`/turmas/${classGroupId}`);
  revalidatePath("/agenda");
  return { ok: true, data: null };
}
