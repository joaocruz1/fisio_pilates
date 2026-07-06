import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";
import { requireTenant } from "@/server/auth";

type Client = Awaited<ReturnType<typeof createClient>>;
export type Session = Database["public"]["Tables"]["sessions"]["Row"];
export type SessionExercise = Database["public"]["Tables"]["session_exercises"]["Row"] & {
  exerciseName: string;
  apparatus: string;
};
export type SessionWithExercises = Session & { exercises: SessionExercise[] };

async function attachExercises(
  supabase: Client,
  sessions: Session[],
): Promise<SessionWithExercises[]> {
  if (sessions.length === 0) return [];
  const ids = sessions.map((s) => s.id);
  const { data: rows } = await supabase
    .from("session_exercises")
    .select("*")
    .in("session_id", ids)
    .order("order_index");

  const exerciseIds = [...new Set((rows ?? []).map((r) => r.exercise_id))];
  const { data: exs } = exerciseIds.length
    ? await supabase.from("exercises").select("id, name, apparatus").in("id", exerciseIds)
    : { data: [] };
  const byId = new Map((exs ?? []).map((e) => [e.id, e]));

  const bySession = new Map<string, SessionExercise[]>();
  for (const r of rows ?? []) {
    const ex = byId.get(r.exercise_id);
    const arr = bySession.get(r.session_id) ?? [];
    arr.push({ ...r, exerciseName: ex?.name ?? "Exercício", apparatus: ex?.apparatus ?? "other" });
    bySession.set(r.session_id, arr);
  }
  return sessions.map((s) => ({ ...s, exercises: bySession.get(s.id) ?? [] }));
}

export const listSessions = cache(async (studentId: string): Promise<SessionWithExercises[]> => {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("sessions")
    .select("*")
    .eq("student_id", studentId)
    .is("deleted_at", null)
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false });
  return attachExercises(supabase, data ?? []);
});

export const getLastSession = cache(
  async (studentId: string): Promise<SessionWithExercises | null> => {
    await requireTenant();
    const supabase = await createClient();
    const { data } = await supabase
      .from("sessions")
      .select("*")
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("session_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1);
    const list = await attachExercises(supabase, data ?? []);
    return list[0] ?? null;
  },
);

export const getSession = cache(async (id: string): Promise<SessionWithExercises> => {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("sessions")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) notFound();
  const [full] = await attachExercises(supabase, [data]);
  if (!full) notFound();
  return full;
});
