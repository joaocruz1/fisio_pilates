import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";
import { requireTenant } from "@/server/auth";

export type Appointment = Database["public"]["Tables"]["appointments"]["Row"] & {
  students: { full_name: string; phone: string | null } | null;
};

/** Agendamentos no intervalo [from, to] (datas YYYY-MM-DD), com o nome do aluno. */
export async function listAppointments(from: string, to: string): Promise<Appointment[]> {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select("*, students(full_name, phone)")
    .gte("appointment_date", from)
    .lte("appointment_date", to)
    .order("appointment_date")
    .order("start_time")
    .returns<Appointment[]>();
  return data ?? [];
}

export type AgendaDiaItem = Appointment & {
  condicoes: string[];
  ultimaAula: { date: string; focus: string | null } | null;
  temPlano: boolean;
  /** id do relatório `next_session` mais recente do aluno (para o modal da agenda). */
  planoReportId: string | null;
  sessaoRegistradaId: string | null;
};

/**
 * Enriquece agendamentos (do dia ou da semana) com o contexto de cada aluno:
 * condições ativas, última aula registrada, id do plano de IA `next_session`
 * mais recente (e `temPlano` derivado) e se a aula já foi registrada (vinculada).
 * Reusado pela visão do dia e pela semana — assim o modal funciona igual nos dois.
 */
export async function enriquecerAppointments(aps: Appointment[]): Promise<AgendaDiaItem[]> {
  if (aps.length === 0) return [];
  const supabase = await createClient();

  const studentIds = [...new Set(aps.map((a) => a.student_id))];
  const apptIds = aps.map((a) => a.id);

  const [condRes, sessRes, planoRes, linkRes] = await Promise.all([
    supabase
      .from("student_conditions")
      .select("student_id, name, status")
      .in("student_id", studentIds)
      .eq("status", "active"),
    supabase
      .from("sessions")
      .select("student_id, session_date, focus")
      .in("student_id", studentIds)
      .is("deleted_at", null)
      .order("session_date", { ascending: false }),
    supabase
      .from("ai_reports")
      .select("id, student_id, created_at")
      .in("student_id", studentIds)
      .eq("report_type", "next_session")
      .eq("status", "completed")
      .order("created_at", { ascending: false }),
    supabase
      .from("sessions")
      .select("id, appointment_id")
      .in("appointment_id", apptIds)
      .is("deleted_at", null),
  ]);

  const condPorAluno = new Map<string, string[]>();
  for (const c of condRes.data ?? []) {
    const arr = condPorAluno.get(c.student_id) ?? [];
    if (arr.length < 4) arr.push(c.name);
    condPorAluno.set(c.student_id, arr);
  }
  const ultimaPorAluno = new Map<string, { date: string; focus: string | null }>();
  for (const s of sessRes.data ?? []) {
    if (!ultimaPorAluno.has(s.student_id)) {
      ultimaPorAluno.set(s.student_id, { date: s.session_date, focus: s.focus });
    }
  }
  // Mais recente por aluno (já ordenado por created_at desc). student_id pode
  // ser null em relatórios group_session, mas o filtro report_type='next_session'
  // garante individual — mesmo assim, descartamos null por segurança de tipos.
  const planoPorAluno = new Map<string, string>();
  for (const r of planoRes.data ?? []) {
    if (r.student_id && !planoPorAluno.has(r.student_id)) planoPorAluno.set(r.student_id, r.id);
  }
  const sessaoPorAppt = new Map<string, string>();
  for (const s of linkRes.data ?? []) {
    if (s.appointment_id) sessaoPorAppt.set(s.appointment_id, s.id);
  }

  return aps.map((a) => {
    const planoReportId = planoPorAluno.get(a.student_id) ?? null;
    return {
      ...a,
      condicoes: condPorAluno.get(a.student_id) ?? [],
      ultimaAula: ultimaPorAluno.get(a.student_id) ?? null,
      temPlano: planoReportId != null,
      planoReportId,
      sessaoRegistradaId: sessaoPorAppt.get(a.id) ?? null,
    };
  });
}

/**
 * Agenda de UM dia, enriquecida com o contexto de cada aluno. Alimenta a
 * "visão do dia" para a profissional acompanhar tudo ali.
 */
export async function getAgendaDia(dia: string): Promise<AgendaDiaItem[]> {
  await requireTenant();
  const supabase = await createClient();

  const { data: aps } = await supabase
    .from("appointments")
    .select("*, students(full_name, phone)")
    .eq("appointment_date", dia)
    .order("start_time")
    .returns<Appointment[]>();
  return enriquecerAppointments(aps ?? []);
}

/** Próximos agendamentos de um aluno (a partir de hoje), para a ficha. */
export async function listAppointmentsDoAluno(
  studentId: string,
  fromISO: string,
): Promise<Appointment[]> {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select("*, students(full_name, phone)")
    .eq("student_id", studentId)
    .gte("appointment_date", fromISO)
    .neq("status", "cancelled")
    .order("appointment_date")
    .order("start_time")
    .returns<Appointment[]>();
  return data ?? [];
}

/** Um agendamento específico (para pré-preencher o registro de aula). */
export async function getAppointment(id: string): Promise<Appointment | null> {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("appointments")
    .select("*, students(full_name, phone)")
    .eq("id", id)
    .maybeSingle<Appointment>();
  return data ?? null;
}

// ---------------------------------------------------------------------------
// Aulas coletivas (turmas) — vivem à parte de appointments, mas aparecem na
// mesma agenda. Cada item enriquece a ocorrência com a turma, nº de alunos e
// se há plano de IA pronto (plan_report_id).
// ---------------------------------------------------------------------------
export type AgendaColetivaItem = Database["public"]["Tables"]["class_sessions"]["Row"] & {
  turma: { id: string; name: string } | null;
  numAlunos: number;
  temPlano: boolean;
};

async function enriqueceColetivas(
  sessoes: Database["public"]["Tables"]["class_sessions"]["Row"][],
): Promise<AgendaColetivaItem[]> {
  if (sessoes.length === 0) return [];
  const supabase = await createClient();
  const groupIds = [...new Set(sessoes.map((s) => s.class_group_id))];

  const [turmasRes, vinculosRes] = await Promise.all([
    supabase.from("class_groups").select("id, name").in("id", groupIds),
    supabase
      .from("class_group_students")
      .select("class_group_id, student_id")
      .in("class_group_id", groupIds),
  ]);

  const turmaPorId = new Map((turmasRes.data ?? []).map((t) => [t.id, t]));
  const countPorGrupo = new Map<string, number>();
  for (const v of vinculosRes.data ?? []) {
    countPorGrupo.set(v.class_group_id, (countPorGrupo.get(v.class_group_id) ?? 0) + 1);
  }

  return sessoes.map((s) => ({
    ...s,
    turma: turmaPorId.get(s.class_group_id) ?? null,
    numAlunos: countPorGrupo.get(s.class_group_id) ?? 0,
    temPlano: s.plan_report_id != null,
  }));
}

/** Aulas coletivas de UM dia, enriquecidas (para a visão do dia). */
export async function getAgendaDiaColetiva(dia: string): Promise<AgendaColetivaItem[]> {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("class_sessions")
    .select("*")
    .eq("session_date", dia)
    .order("start_time");
  return enriqueceColetivas(data ?? []);
}

/** Aulas coletivas num intervalo [from, to] (para a visão de semana). */
export async function listClassSessionsInterval(
  from: string,
  to: string,
): Promise<AgendaColetivaItem[]> {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("class_sessions")
    .select("*")
    .gte("session_date", from)
    .lte("session_date", to)
    .order("session_date")
    .order("start_time");
  return enriqueceColetivas(data ?? []);
}
