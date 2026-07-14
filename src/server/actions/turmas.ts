"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { validaRotacao } from "@/lib/ai/rotacao";
import { type PlanoAulaGrupo, planoAulaGrupoSchema } from "@/lib/ai/schemas/plano-aula-grupo";
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

const DEFAULT_SEMANAS = 8;

/** Próximas N datas (YYYY-MM-DD) que caem no `weekday` (0=Dom..6=Sáb), a partir de amanhã. */
function proximasDatas(weekday: number, semanas: number): string[] {
  const datas: string[] = [];
  const base = new Date();
  base.setHours(0, 0, 0, 0);
  base.setDate(base.getDate() + 1); // começa amanhã
  // primeiro alvo: próximo dia com aquele weekday (inclusive hoje+1)
  const dia = base.getDay();
  const delta = (weekday - dia + 7) % 7;
  base.setDate(base.getDate() + delta);
  for (let i = 0; i < semanas; i++) {
    const y = base.getFullYear();
    const m = String(base.getMonth() + 1).padStart(2, "0");
    const d = String(base.getDate()).padStart(2, "0");
    datas.push(`${y}-${m}-${d}`);
    base.setDate(base.getDate() + 7);
  }
  return datas;
}

/**
 * Gera ocorrências (class_sessions) da turma a partir do slot habitual
 * (weekday + start_time) para as próximas `semanas`. Idempotente pela unique
 * (tenant_id, class_group_id, session_date, start_time). Fire-and-forget nos
 * criar/atualizar; chamável manualmente para estender.
 */
export async function gerarOcorrenciasTurma(
  turmaId: string,
  semanas: number = DEFAULT_SEMANAS,
): Promise<ActionResult<{ criadas: number }>> {
  const ctx = await requireTenant();
  const supabase = await createClient();

  const { data: turma } = await supabase
    .from("class_groups")
    .select("weekday, start_time, default_duration_min")
    .eq("id", turmaId)
    .maybeSingle();
  if (!turma) return { ok: false, erro: "Turma não encontrada." };
  if (turma.weekday == null || !turma.start_time) {
    return { ok: false, erro: "Defina o dia da semana e o horário habitual da turma." };
  }

  const startTime = turma.start_time;
  const durationMin = turma.default_duration_min ?? 50;
  const datas = proximasDatas(turma.weekday, semanas);
  const rows = datas.map((session_date) => ({
    tenant_id: ctx.tenant.id,
    class_group_id: turmaId,
    session_date,
    start_time: startTime,
    duration_min: durationMin,
    status: "scheduled" as const,
    created_by: ctx.user.id,
  }));

  // upsert com ignoreDuplicates → ON CONFLICT (cols) DO NOTHING. Idempotente.
  const { data: inseridos, error } = await supabase
    .from("class_sessions")
    .upsert(rows, {
      onConflict: "tenant_id,class_group_id,session_date,start_time",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) {
    if (error.code === "23505") {
      return { ok: true, data: { criadas: 0 } };
    }
    return { ok: false, erro: "Não foi possível gerar as ocorrências. Tente novamente." };
  }

  await registrarAuditoria(supabase, {
    tenantId: ctx.tenant.id,
    userId: ctx.user.id,
    action: "class_session.bulk_schedule",
    entityType: "class_group",
    entityId: turmaId,
    metadata: { semanas, geradas: inseridos?.length ?? 0 },
  });

  revalidatePath(`/turmas/${turmaId}`);
  revalidatePath("/agenda");
  return { ok: true, data: { criadas: inseridos?.length ?? 0 } };
}

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

  // Gera ocorrências das próximas semanas a partir do slot habitual (se definido).
  if (d.weekday != null && d.startTime) {
    void gerarOcorrenciasTurma(data.id).catch((e) =>
      console.error("[turmas] auto-gerar ocorrências falhou:", e),
    );
  }

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

  // Gera/estende ocorrências se o slot habitual foi definido (idempotente).
  if (d.weekday != null && d.startTime) {
    void gerarOcorrenciasTurma(id).catch((e) =>
      console.error("[turmas] auto-gerar ocorrências falhou:", e),
    );
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

type SnapshotAluno = { rotulo: string; studentId: string };
type SnapshotEstacao = { label: string; apparatus: string };

/**
 * Salva edições manuais do plano coletivo (ai_reports.structured). Revalida a
 * rotação com os rótulos/estações do `input_snapshot` e o catálogo atual de
 * exercícios — `avisos` (não-fatais) são retornados sem bloquear o salvamento.
 */
export async function salvarPlanoColetivo(
  reportId: string,
  plano: PlanoAulaGrupo,
): Promise<ActionResult<{ avisos: string[] }>> {
  const ctx = await requireTenant();
  const supabase = await createClient();

  const parsed = planoAulaGrupoSchema.safeParse(plano);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Plano inválido." };
  }

  // Posse: o relatório pertence ao tenant.
  const { data: report } = await supabase
    .from("ai_reports")
    .select("input_snapshot, class_session_id")
    .eq("id", reportId)
    .eq("tenant_id", ctx.tenant.id)
    .maybeSingle();
  if (!report) return { ok: false, erro: "Plano não encontrado." };

  // Reconstrói alunos/estações a partir do snapshot para validar a rotação.
  const snapshot = (report.input_snapshot ?? {}) as {
    alunos?: SnapshotAluno[];
    estacoes?: SnapshotEstacao[];
  };
  const alunos = (snapshot.alunos ?? []).map((a) => ({
    rotulo: a.rotulo,
    studentId: a.studentId,
  }));
  const estacoes = snapshot.estacoes ?? [];

  // Catálogo atual de exercícios ativos por aparelho.
  const { data: exs } = await supabase
    .from("exercises")
    .select("name, apparatus")
    .eq("is_active", true);
  const catalogo = new Map<string, Set<string>>();
  for (const e of exs ?? []) {
    const set = catalogo.get(e.apparatus) ?? new Set<string>();
    set.add(e.name);
    catalogo.set(e.apparatus, set);
  }

  const rot = validaRotacao(parsed.data, alunos, estacoes, catalogo);

  const { error } = await supabase
    .from("ai_reports")
    .update({
      structured: parsed.data as never,
      status: "completed",
      error_message: rot.ok ? null : rot.erros.join(" "),
      completed_at: new Date().toISOString(),
    })
    .eq("id", reportId);
  if (error) return { ok: false, erro: "Não foi possível salvar o plano. Tente novamente." };

  if (report.class_session_id) {
    const { data: sessao } = await supabase
      .from("class_sessions")
      .select("class_group_id")
      .eq("id", report.class_session_id)
      .maybeSingle();
    if (sessao?.class_group_id) {
      revalidatePath(`/turmas/${sessao.class_group_id}/aulas/${report.class_session_id}/plano`);
      revalidatePath(`/turmas/${sessao.class_group_id}`);
      revalidatePath("/agenda");
    }
  }

  return { ok: true, data: { avisos: [...rot.avisos, ...rot.erros] } };
}
