import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import type { AlunaDoPlano, EstacaoDoPlano } from "@/components/turmas/plano-coletivo-view";
import type { PlanoAulaGrupo } from "@/lib/ai/schemas/plano-aula-grupo";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";
import type { AgendaColetivaItem } from "@/server/agenda";
import { requireTenant } from "@/server/auth";

export type Turma = Database["public"]["Tables"]["class_groups"]["Row"];
export type ClassSession = Database["public"]["Tables"]["class_sessions"]["Row"];
export type AlunoDaTurma = {
  id: string;
  full_name: string;
  ordem: number;
  joined_at: string;
  status: string;
  conditions: { name: string; status: string; severity: string | null }[];
};

/** Lista as turmas ativas (não arquivadas) do tenant. */
export const listTurmas = cache(async (): Promise<Turma[]> => {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("class_groups")
    .select("*")
    .eq("status", "active")
    .order("name");
  return data ?? [];
});

/** Lista todas as turmas (ativas + arquivadas) do tenant. */
export const listTodasTurmas = cache(async (): Promise<Turma[]> => {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase.from("class_groups").select("*").order("status").order("name");
  return data ?? [];
});

/** Busca uma turma por id (RLS garante o escopo). 404 se não achar. */
export const getTurma = cache(async (id: string): Promise<Turma> => {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase.from("class_groups").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return data;
});

/** Alunos recorrentes da turma, ordenados por `ordem`, com condições ativas. */
export const listAlunosDaTurma = cache(async (classGroupId: string): Promise<AlunoDaTurma[]> => {
  await requireTenant();
  const supabase = await createClient();
  const { data: vinculos } = await supabase
    .from("class_group_students")
    .select("student_id, ordem, joined_at")
    .eq("class_group_id", classGroupId)
    .order("ordem")
    .order("joined_at");

  if (!vinculos || vinculos.length === 0) return [];
  const studentIds = vinculos.map((v) => v.student_id);

  const [{ data: alunos }, { data: condicoes }] = await Promise.all([
    supabase
      .from("students")
      .select("id, full_name, status")
      .in("id", studentIds)
      .is("deleted_at", null),
    supabase
      .from("student_conditions")
      .select("student_id, name, status, severity")
      .in("student_id", studentIds),
  ]);

  const alunoPorId = new Map((alunos ?? []).map((a) => [a.id, a]));
  const condPorAluno = new Map<string, AlunoDaTurma["conditions"]>();
  for (const c of condicoes ?? []) {
    const arr = condPorAluno.get(c.student_id) ?? [];
    arr.push({ name: c.name, status: c.status, severity: c.severity });
    condPorAluno.set(c.student_id, arr);
  }

  return vinculos
    .map((v) => {
      const aluno = alunoPorId.get(v.student_id);
      if (!aluno) return null;
      return {
        id: aluno.id,
        full_name: aluno.full_name,
        ordem: v.ordem,
        joined_at: v.joined_at,
        status: aluno.status,
        conditions: condPorAluno.get(v.student_id) ?? [],
      };
    })
    .filter((a): a is AlunoDaTurma => a !== null);
});

/** Turma + seus alunos (para a página de edição / geração do plano). */
export const getTurmaComAlunos = cache(
  async (id: string): Promise<{ turma: Turma; alunos: AlunoDaTurma[] }> => {
    const turma = await getTurma(id);
    const alunos = await listAlunosDaTurma(id);
    return { turma, alunos };
  },
);

/** Ocorrências (class_sessions) da turma, mais recentes primeiro. */
export const listClassSessionsDaTurma = cache(
  async (classGroupId: string): Promise<ClassSession[]> => {
    await requireTenant();
    const supabase = await createClient();
    const { data } = await supabase
      .from("class_sessions")
      .select("*")
      .eq("class_group_id", classGroupId)
      .order("session_date", { ascending: false })
      .order("start_time", { ascending: false });
    return data ?? [];
  },
);

/** Ocorrências de turmas num dia (para a agenda). */
export const listClassSessionsDoDia = cache(async (dia: string): Promise<ClassSession[]> => {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("class_sessions")
    .select("*")
    .eq("session_date", dia)
    .order("start_time");
  return data ?? [];
});

/** Busca uma ocorrência por id (RLS garante o escopo). 404 se não achar. */
export const getClassSession = cache(async (id: string): Promise<ClassSession> => {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase.from("class_sessions").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return data;
});

/** Plano (ai_reports) gerado para a ocorrência, se houver. */
export const getPlanoColetivo = cache(
  async (reportId: string): Promise<Database["public"]["Tables"]["ai_reports"]["Row"]> => {
    await requireTenant();
    const supabase = await createClient();
    const { data } = await supabase.from("ai_reports").select("*").eq("id", reportId).maybeSingle();
    if (!data) notFound();
    return data;
  },
);

type SnapshotColetivo = {
  alunos?: { rotulo: string; studentId: string }[];
  estacoes?: { label: string; apparatus: string }[];
};

/** Dados prontos para renderizar o board de um plano coletivo (modal ou página). */
export type PlanoColetivoViewData = {
  temPlano: boolean;
  status: string;
  errorMessage: string | null;
  reportId: string | null;
  plano: PlanoAulaGrupo | null;
  alunos: AlunaDoPlano[];
  estacoes: EstacaoDoPlano[];
};

/**
 * Reúne tudo que a visualização do plano coletivo precisa (turma não inclusa):
 * o `structured` (PlanoAulaGrupo) + nomes reais das alunas resolvidos a partir
 * do `input_snapshot` do relatório (robusto a reordenação/remoção posterior) +
 * estações. Reusado pela página do plano e pelo modal da agenda.
 */
export async function getPlanoColetivoViewData(sessionId: string): Promise<PlanoColetivoViewData> {
  const sessao = await getClassSession(sessionId);
  if (!sessao.plan_report_id) {
    return {
      temPlano: false,
      status: "idle",
      errorMessage: null,
      reportId: null,
      plano: null,
      alunos: [],
      estacoes: [],
    };
  }
  const report = await getPlanoColetivo(sessao.plan_report_id);
  const snapshot = (report.input_snapshot ?? {}) as SnapshotColetivo;
  const plano = report.structured as PlanoAulaGrupo | null;
  const snapshotAlunos = snapshot.alunos ?? [];
  const studentIds = snapshotAlunos.map((a) => a.studentId);

  const supabase = await createClient();
  let estudantes: { id: string; full_name: string }[] = [];
  if (studentIds.length) {
    const r = await supabase.from("students").select("id, full_name").in("id", studentIds);
    estudantes = r.data ?? [];
  }
  const nomePorId = new Map(estudantes.map((s) => [s.id, s.full_name]));
  const alunos: AlunaDoPlano[] = snapshotAlunos.map((a) => ({
    rotulo: a.rotulo,
    full_name: nomePorId.get(a.studentId) ?? a.rotulo,
  }));
  const estacoes: EstacaoDoPlano[] = snapshot.estacoes ?? [];

  return {
    temPlano: true,
    status: report.status,
    errorMessage: report.error_message,
    reportId: report.id,
    plano,
    alunos,
    estacoes,
  };
}

/** Dados do modal de uma coletiva na agenda: roster de alunas + plano (se houver). */
export type DadosModalColetiva = {
  alunas: AlunoDaTurma[];
  plano: PlanoColetivoViewData | null;
};

/**
 * Prefetch dos dados de modal para todas as coletivas visíveis (dia ou semana):
 * roster por turma (cache-dedup) + plano por ocorrência com `plan_report_id`.
 * Retorna um mapa sessionId → DadosModalColetiva.
 */
export async function getDadosModaisColetiva(
  sessions: AgendaColetivaItem[],
): Promise<Record<string, DadosModalColetiva>> {
  if (sessions.length === 0) return {};
  const groupIds = [...new Set(sessions.map((s) => s.class_group_id))];
  const comPlano = sessions.filter((s) => s.plan_report_id);

  const [alunosEntries, planoEntries] = await Promise.all([
    Promise.all(groupIds.map(async (gid) => [gid, await listAlunosDaTurma(gid)] as const)),
    Promise.all(comPlano.map(async (s) => [s.id, await getPlanoColetivoViewData(s.id)] as const)),
  ]);

  const alunas: Record<string, AlunoDaTurma[]> = Object.fromEntries(alunosEntries);
  const planos: Record<string, PlanoColetivoViewData> = Object.fromEntries(planoEntries);

  const modais: Record<string, DadosModalColetiva> = {};
  for (const s of sessions) {
    modais[s.id] = { alunas: alunas[s.class_group_id] ?? [], plano: planos[s.id] ?? null };
  }
  return modais;
}
