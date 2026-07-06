import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/server/auth";

export type DashboardStats = {
  alunosAtivos: number;
  sessoesSemana: number;
  precisamAtencao: { id: string; full_name: string; ultimaSessao: string | null }[];
};

function inicioDaSemanaISO(): string {
  const hoje = new Date();
  const dia = hoje.getDay(); // 0 = domingo
  const segunda = new Date(hoje);
  segunda.setDate(hoje.getDate() - ((dia + 6) % 7)); // volta até segunda
  segunda.setHours(0, 0, 0, 0);
  return segunda.toISOString().slice(0, 10);
}

/** 15 dias atrás, em ISO (yyyy-mm-dd). */
function corteAtencaoISO(): string {
  const d = new Date();
  d.setDate(d.getDate() - 15);
  return d.toISOString().slice(0, 10);
}

export const getDashboardStats = cache(async (): Promise<DashboardStats> => {
  await requireTenant();
  const supabase = await createClient();

  // Alunos ativos (RLS aplica o tenant).
  const { data: ativos } = await supabase
    .from("students")
    .select("id, full_name")
    .eq("status", "active")
    .is("deleted_at", null);
  const alunos = ativos ?? [];

  // Sessões desta semana.
  const { count: sessoesSemana } = await supabase
    .from("sessions")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .gte("session_date", inicioDaSemanaISO());

  // Última sessão por aluno ativo (para "precisam de atenção").
  const { data: sessoes } = await supabase
    .from("sessions")
    .select("student_id, session_date")
    .is("deleted_at", null)
    .order("session_date", { ascending: false });

  const ultimaPorAluno = new Map<string, string>();
  for (const s of sessoes ?? []) {
    if (!ultimaPorAluno.has(s.student_id)) ultimaPorAluno.set(s.student_id, s.session_date);
  }

  const corte = corteAtencaoISO();
  const precisamAtencao = alunos
    .map((a) => ({
      id: a.id,
      full_name: a.full_name,
      ultimaSessao: ultimaPorAluno.get(a.id) ?? null,
    }))
    .filter((a) => a.ultimaSessao === null || a.ultimaSessao < corte)
    .slice(0, 8);

  return {
    alunosAtivos: alunos.length,
    sessoesSemana: sessoesSemana ?? 0,
    precisamAtencao,
  };
});
