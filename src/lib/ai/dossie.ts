import "server-only";
import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { ragSearch } from "@/lib/ai/rag";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";
import { idadeAnos } from "@/lib/utils";

type Client = SupabaseClient<Database>;

export type Periodo = { from: string | null; to: string | null };
export type Dossie = {
  promptUser: string;
  snapshot: Record<string, unknown>;
  inputHash: string;
  temFotos: boolean;
};

const rec = (j: unknown) => (j ?? {}) as Record<string, string | undefined>;

/** Limites do dossiê (compact = montar aula; completo = relatório de evolução). */
export type LimDossie = {
  sessions: number;
  measurements: number;
  docs: number;
  docChars: number;
  kbK: number;
  kbChars: number;
};

export const LIM_COMPACTO: LimDossie = {
  sessions: 12,
  measurements: 8,
  docs: 5,
  docChars: 1200,
  kbK: 6,
  kbChars: 700,
};

export const LIM_COMPLETO: LimDossie = {
  sessions: 40,
  measurements: 24,
  docs: 12,
  docChars: 2500,
  kbK: 10,
  kbChars: 1000,
};

/** Peças pseudonimizadas de UMA aluna, prontas para um bloco do prompt. */
export type FichaAluna = {
  fichaLinhas: string[];
  sessoesLinhas: string[];
  medidasLinhas: string[];
  docsLinhas: string[];
  ragTermos: { nomesCond: string[]; queixa: string; objetivos: string[] };
  temFotos: boolean;
  sessionIds: string[];
  assessmentIds: string[];
  conditionCount: number;
  measurementCount: number;
};

/**
 * Reúne e PSEUDONIMIZA os dados de UMA aluna (sem nome/CPF/telefone/e-mail) para
 * a IA. A pseudonimização é regra de código, não convenção (LGPD — ver
 * 07-lgpd-seguranca.md). Reutilizado por buildDossie (relatório individual) e
 * buildDossieColetivo (aula coletiva).
 */
export async function montarFichaAluna(
  studentId: string,
  supabase: Client,
  period: Periodo,
  lim: LimDossie,
): Promise<FichaAluna> {
  // Queries com filtro de período (montadas antes do Promise.all).
  let sq = supabase
    .from("sessions")
    .select("id, session_date, duration_min, focus, pain_level_pre, pain_level_post, notes")
    .eq("student_id", studentId)
    .is("deleted_at", null);
  if (period.from) sq = sq.gte("session_date", period.from);
  if (period.to) sq = sq.lte("session_date", period.to);
  const sessionsQuery = sq.order("session_date", { ascending: true }).limit(lim.sessions);

  let mq = supabase
    .from("body_measurements")
    .select("measured_at, weight_kg, circumferences, flexibility")
    .eq("student_id", studentId);
  if (period.from) mq = mq.gte("measured_at", period.from);
  if (period.to) mq = mq.lte("measured_at", period.to);
  const measurementsQuery = mq.order("measured_at", { ascending: true }).limit(lim.measurements);

  // 1ª onda: todas as queries independentes em paralelo.
  const [
    { data: student },
    { data: conditions },
    { data: assessments },
    { data: sessions },
    { data: measurements },
    { data: docs },
    { count: fotosCount },
  ] = await Promise.all([
    supabase.from("students").select("birth_date, sex, occupation").eq("id", studentId).single(),
    supabase
      .from("student_conditions")
      .select("name, cid_code, status, severity, notes")
      .eq("student_id", studentId),
    supabase
      .from("assessments")
      .select(
        "id, kind, assessed_at, main_complaint, pain_level_initial, goals, contraindications, anamnesis, postural_assessment",
      )
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .order("assessed_at", { ascending: false })
      .limit(3),
    sessionsQuery,
    measurementsQuery,
    supabase
      .from("documents")
      .select("kind, extracted_text, taken_at, created_at")
      .eq("student_id", studentId)
      .is("deleted_at", null)
      .not("extracted_text", "is", null)
      .order("created_at", { ascending: false })
      .limit(lim.docs),
    supabase
      .from("documents")
      .select("id", { count: "exact", head: true })
      .eq("student_id", studentId)
      .eq("kind", "postural_photo")
      .is("deleted_at", null),
  ]);

  // 2ª onda: session_exercises + nomes dos exercícios.
  const sessionIds = (sessions ?? []).map((s) => s.id);
  const { data: sessionExercises } = sessionIds.length
    ? await supabase
        .from("session_exercises")
        .select("session_id, exercise_id, sets, reps, load_springs, resistance_level")
        .in("session_id", sessionIds)
    : { data: [] };
  const exIds = [...new Set((sessionExercises ?? []).map((e) => e.exercise_id))];
  const { data: exs } = exIds.length
    ? await supabase.from("exercises").select("id, name").in("id", exIds)
    : { data: [] };
  const nomeEx = new Map((exs ?? []).map((e) => [e.id, e.name]));

  // --- Blocos pseudonimizados ---
  const idade = idadeAnos(student?.birth_date);
  const fichaLinhas: string[] = [
    `Aluna: ${idade != null ? `${idade} anos` : "idade não informada"}, sexo ${student?.sex ?? "não informado"}${student?.occupation ? `, profissão: ${student.occupation}` : ""}.`,
  ];
  if ((conditions ?? []).length) {
    fichaLinhas.push(
      "Condições: " +
        (conditions ?? [])
          .map((c) => `${c.name}${c.severity ? ` (${c.severity})` : ""} [${c.status}]`)
          .join("; "),
    );
  }
  for (const a of assessments ?? []) {
    const an = rec(a.anamnesis);
    const po = rec(a.postural_assessment);
    fichaLinhas.push(
      `Avaliação ${a.kind} em ${a.assessed_at}: queixa "${a.main_complaint ?? "—"}", dor inicial ${a.pain_level_initial ?? "—"}/10.` +
        (a.goals?.length ? ` Objetivos: ${a.goals.join(", ")}.` : "") +
        (a.contraindications?.length
          ? ` Contraindicações: ${a.contraindications.join(", ")}.`
          : "") +
        (an.hda ? ` HDA: ${an.hda}.` : "") +
        (po.anterior || po.posterior || po.lateral
          ? ` Postural: ${[po.anterior, po.posterior, po.lateral].filter(Boolean).join(" / ")}.`
          : ""),
    );
  }

  const exercisesBySession = new Map<string, string[]>();
  for (const se of sessionExercises ?? []) {
    const arr = exercisesBySession.get(se.session_id) ?? [];
    const partes = [
      nomeEx.get(se.exercise_id) ?? "exercício",
      se.sets && se.reps ? `${se.sets}x${se.reps}` : null,
      se.load_springs,
      se.resistance_level ? `nível ${se.resistance_level}` : null,
    ].filter(Boolean);
    arr.push(partes.join(" "));
    exercisesBySession.set(se.session_id, arr);
  }
  const sessoesLinhas = (sessions ?? []).map((s) => {
    const ex = exercisesBySession.get(s.id) ?? [];
    return `${s.session_date}: ${s.focus ?? "aula"}, dor ${s.pain_level_pre ?? "—"}→${s.pain_level_post ?? "—"}. Exercícios: ${ex.join("; ") || "não registrados"}.`;
  });

  const medidasLinhas = (measurements ?? []).map((m) => {
    const c = rec(m.circumferences);
    return `${m.measured_at}: peso ${m.weight_kg ?? "—"}kg, cintura ${c.waist_cm ?? "—"}cm, quadril ${c.hip_cm ?? "—"}cm.`;
  });

  const docsLinhas = (docs ?? []).map(
    (d) =>
      `[${d.kind}${d.taken_at ? ` ${d.taken_at}` : ""}] ${(d.extracted_text ?? "").slice(0, lim.docChars)}`,
  );

  return {
    fichaLinhas,
    sessoesLinhas,
    medidasLinhas,
    docsLinhas,
    ragTermos: {
      nomesCond: (conditions ?? []).map((c) => c.name),
      queixa: assessments?.[0]?.main_complaint ?? "",
      objetivos: (assessments?.[0]?.goals ?? []) as string[],
    },
    temFotos: (fotosCount ?? 0) > 0,
    sessionIds,
    assessmentIds: (assessments ?? []).map((a) => a.id),
    conditionCount: (conditions ?? []).length,
    measurementCount: (measurements ?? []).length,
  };
}

/**
 * Monta o dossiê do aluno PSEUDONIMIZADO (sem nome/CPF/telefone/e-mail) para a IA.
 * A pseudonimização é regra de código, não convenção (LGPD — ver 07-lgpd-seguranca.md).
 */
export async function buildDossie(params: {
  tenantId: string;
  studentId: string;
  period: Periodo;
  /** Força o complemento de busca web (Tavily) mesmo quando a base local cobre. */
  forcarWeb?: boolean;
  /** Dossiê enxuto (menos sessões/docs/trechos) — usado ao montar aula (mais rápido). */
  compact?: boolean;
  /** Callback de progresso real (para streaming ao usuário). */
  onEtapa?: (etapa: "dados" | "base") => void;
}): Promise<Dossie> {
  const { tenantId, studentId, period, compact, onEtapa } = params;
  const supabase = await createClient();
  onEtapa?.("dados");

  const lim = compact ? LIM_COMPACTO : LIM_COMPLETO;
  const ficha = await montarFichaAluna(studentId, supabase, period, lim);

  // --- RAG (query só com termos técnicos; nunca dados identificáveis do aluno) ---
  const { nomesCond, queixa, objetivos } = ficha.ragTermos;
  const ragQuery =
    `${nomesCond.join(", ")} ${queixa} ${objetivos.join(" ")} pilates exercícios progressão contraindicações segurança`
      .replace(/\s+/g, " ")
      .trim();
  onEtapa?.("base");
  const { kbChunks, webResults } = await ragSearch(ragQuery, {
    tenantId,
    k: lim.kbK,
    forcarWeb: params.forcarWeb,
  });
  const conhecimentoLinhas = [
    ...kbChunks.map(
      (c, i) => `[KB-${i + 1}] ${c.context_header ?? ""}: ${c.content.slice(0, lim.kbChars)}`,
    ),
    ...webResults.map((w, i) => `[WEB-${i + 1}] ${w.title} (${w.url}): ${w.content.slice(0, 600)}`),
  ];

  const promptUser = [
    `<ficha>\n${ficha.fichaLinhas.join("\n")}\n</ficha>`,
    `<aulas>\n${ficha.sessoesLinhas.join("\n") || "Sem aulas no período."}\n</aulas>`,
    `<medidas>\n${ficha.medidasLinhas.join("\n") || "Sem medidas no período."}\n</medidas>`,
    `<documentos>\n${ficha.docsLinhas.join("\n\n") || "Sem documentos com texto."}\n</documentos>`,
    `<conhecimento>\n${conhecimentoLinhas.join("\n\n") || "Sem material relevante na base."}\n</conhecimento>`,
    `Gere o relatório de evolução do período ${period.from ?? "início"} a ${period.to ?? "hoje"}.`,
  ].join("\n\n");

  const snapshot = {
    period,
    assessmentIds: ficha.assessmentIds,
    sessionIds: ficha.sessionIds,
    measurementCount: ficha.measurementCount,
    conditionCount: ficha.conditionCount,
    kbChunkIds: kbChunks.map((c) => c.id),
    webUrls: webResults.map((w) => w.url),
  };
  const inputHash = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");

  return { promptUser, snapshot, inputHash, temFotos: ficha.temFotos };
}
