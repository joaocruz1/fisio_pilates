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
  students: { id: string; full_name: string; status: string; phone: string | null } | null;
  condicoes: string[];
  ultimaAula: { date: string; focus: string | null } | null;
  temPlano: boolean;
  sessaoRegistradaId: string | null;
};

/**
 * Agenda de UM dia, enriquecida com o contexto de cada aluno: condições ativas,
 * última aula registrada, se há plano de IA pronto e se a aula já foi registrada
 * (vinculada). Alimenta a "visão do dia" para a profissional acompanhar tudo ali.
 */
export async function getAgendaDia(dia: string): Promise<AgendaDiaItem[]> {
  await requireTenant();
  const supabase = await createClient();

  const { data: aps } = await supabase
    .from("appointments")
    .select("*, students(id, full_name, status, phone)")
    .eq("appointment_date", dia)
    .order("start_time")
    .returns<AgendaDiaItem[]>();
  if (!aps || aps.length === 0) return [];

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
      .select("student_id")
      .in("student_id", studentIds)
      .eq("report_type", "next_session")
      .eq("status", "completed"),
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
  const comPlano = new Set((planoRes.data ?? []).map((r) => r.student_id));
  const sessaoPorAppt = new Map<string, string>();
  for (const s of linkRes.data ?? []) {
    if (s.appointment_id) sessaoPorAppt.set(s.appointment_id, s.id);
  }

  return aps.map((a) => ({
    ...a,
    condicoes: condPorAluno.get(a.student_id) ?? [],
    ultimaAula: ultimaPorAluno.get(a.student_id) ?? null,
    temPlano: comPlano.has(a.student_id),
    sessaoRegistradaId: sessaoPorAppt.get(a.id) ?? null,
  }));
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
