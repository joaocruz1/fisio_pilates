"use server";
import "server-only";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/server/actions/result";
import { requireTenant } from "@/server/auth";
import { registrarAuditoria } from "@/server/services/audit";

/** Exporta todos os dados do aluno em JSON (direito de portabilidade — LGPD). */
export async function exportarDadosAluno(
  studentId: string,
): Promise<ActionResult<{ json: string }>> {
  const ctx = await requireTenant();
  const supabase = await createClient();

  const [student, assessments, conditions, sessions, measurements, documents, reports] =
    await Promise.all([
      supabase.from("students").select("*").eq("id", studentId).maybeSingle(),
      supabase.from("assessments").select("*").eq("student_id", studentId),
      supabase.from("student_conditions").select("*").eq("student_id", studentId),
      supabase.from("sessions").select("*").eq("student_id", studentId),
      supabase.from("body_measurements").select("*").eq("student_id", studentId),
      supabase.from("documents").select("*").eq("student_id", studentId),
      supabase.from("ai_reports").select("*").eq("student_id", studentId),
    ]);

  if (!student.data) return { ok: false, erro: "Aluno não encontrado." };

  const sessionIds = (sessions.data ?? []).map((s) => s.id);
  const { data: sessionExercises } = sessionIds.length
    ? await supabase.from("session_exercises").select("*").in("session_id", sessionIds)
    : { data: [] };

  const pacote = {
    exportadoEm: new Date().toISOString(),
    aluno: student.data,
    avaliacoes: assessments.data ?? [],
    condicoes: conditions.data ?? [],
    sessoes: sessions.data ?? [],
    exerciciosDeSessao: sessionExercises ?? [],
    medidas: measurements.data ?? [],
    documentos: documents.data ?? [],
    relatorios: reports.data ?? [],
  };

  await registrarAuditoria(supabase, {
    tenantId: ctx.tenant.id,
    userId: ctx.user.id,
    action: "student.export",
    entityType: "student",
    entityId: studentId,
  });

  return { ok: true, data: { json: JSON.stringify(pacote, null, 2) } };
}

/** Exclusão da conta: apaga o tenant (cascade) e a usuária. Só a titular (owner). */
export async function excluirConta(): Promise<ActionResult> {
  const ctx = await requireTenant();
  if (ctx.role !== "owner") {
    return { ok: false, erro: "Apenas a titular pode excluir a conta." };
  }

  const admin = createAdminClient();
  // Apaga o tenant (cascade remove alunos, sessões, documentos, relatórios, chats…).
  const { error: tErr } = await admin.from("tenants").delete().eq("id", ctx.tenant.id);
  if (tErr) return { ok: false, erro: "Não foi possível excluir a conta. Tente novamente." };

  // Remove a usuária do Auth.
  await admin.auth.admin.deleteUser(ctx.user.id);
  // Nota: a purga dos binários em Storage é feita por um job de limpeza (backlog).

  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
