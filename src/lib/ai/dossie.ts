import "server-only";
import { createHash } from "node:crypto";
import { ragSearch } from "@/lib/ai/rag";
import { createClient } from "@/lib/supabase/server";
import { idadeAnos } from "@/lib/utils";

export type Periodo = { from: string | null; to: string | null };
export type Dossie = {
  promptUser: string;
  snapshot: Record<string, unknown>;
  inputHash: string;
  temFotos: boolean;
};

const rec = (j: unknown) => (j ?? {}) as Record<string, string | undefined>;

/**
 * Monta o dossiê do aluno PSEUDONIMIZADO (sem nome/CPF/telefone/e-mail) para a IA.
 * A pseudonimização é regra de código, não convenção (LGPD — ver 07-lgpd-seguranca.md).
 */
export async function buildDossie(params: {
  tenantId: string;
  studentId: string;
  period: Periodo;
}): Promise<Dossie> {
  const { tenantId, studentId, period } = params;
  const supabase = await createClient();

  const { data: student } = await supabase
    .from("students")
    .select("birth_date, sex, occupation")
    .eq("id", studentId)
    .single();

  const { data: conditions } = await supabase
    .from("student_conditions")
    .select("name, cid_code, status, severity, notes")
    .eq("student_id", studentId);

  const { data: assessments } = await supabase
    .from("assessments")
    .select("*")
    .eq("student_id", studentId)
    .is("deleted_at", null)
    .order("assessed_at", { ascending: false })
    .limit(3);

  let sq = supabase
    .from("sessions")
    .select("id, session_date, duration_min, focus, pain_level_pre, pain_level_post, notes")
    .eq("student_id", studentId)
    .is("deleted_at", null);
  if (period.from) sq = sq.gte("session_date", period.from);
  if (period.to) sq = sq.lte("session_date", period.to);
  const { data: sessions } = await sq.order("session_date", { ascending: true }).limit(40);

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

  let mq = supabase
    .from("body_measurements")
    .select("measured_at, weight_kg, circumferences, flexibility")
    .eq("student_id", studentId);
  if (period.from) mq = mq.gte("measured_at", period.from);
  if (period.to) mq = mq.lte("measured_at", period.to);
  const { data: measurements } = await mq.order("measured_at", { ascending: true }).limit(24);

  const { data: docs } = await supabase
    .from("documents")
    .select("kind, extracted_text, taken_at")
    .eq("student_id", studentId)
    .is("deleted_at", null)
    .not("extracted_text", "is", null)
    .limit(5);
  const { count: fotosCount } = await supabase
    .from("documents")
    .select("id", { count: "exact", head: true })
    .eq("student_id", studentId)
    .eq("kind", "postural_photo")
    .is("deleted_at", null);
  const temFotos = (fotosCount ?? 0) > 0;

  // --- Blocos do prompt (pseudonimizados) ---
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
    return `${s.session_date}: ${s.focus ?? "sessão"}, dor ${s.pain_level_pre ?? "—"}→${s.pain_level_post ?? "—"}. Exercícios: ${ex.join("; ") || "não registrados"}.`;
  });

  const medidasLinhas = (measurements ?? []).map((m) => {
    const c = rec(m.circumferences);
    return `${m.measured_at}: peso ${m.weight_kg ?? "—"}kg, cintura ${c.waist_cm ?? "—"}cm, quadril ${c.hip_cm ?? "—"}cm.`;
  });

  const docsLinhas = (docs ?? []).map(
    (d) =>
      `[${d.kind}${d.taken_at ? ` ${d.taken_at}` : ""}] ${(d.extracted_text ?? "").slice(0, 1500)}`,
  );

  // --- RAG (query só com termos técnicos) ---
  const queixa = assessments?.[0]?.main_complaint ?? "";
  const nomesCond = (conditions ?? []).map((c) => c.name).join(" ");
  const ragQuery = `${queixa} ${nomesCond} pilates progressão exercícios`.trim();
  const { kbChunks, webResults } = await ragSearch(ragQuery, { tenantId, k: 8 });
  const conhecimentoLinhas = [
    ...kbChunks.map(
      (c, i) => `[KB-${i + 1}] ${c.context_header ?? ""}: ${c.content.slice(0, 800)}`,
    ),
    ...webResults.map((w, i) => `[WEB-${i + 1}] ${w.title} (${w.url}): ${w.content.slice(0, 500)}`),
  ];

  const promptUser = [
    `<ficha>\n${fichaLinhas.join("\n")}\n</ficha>`,
    `<sessoes>\n${sessoesLinhas.join("\n") || "Sem sessões no período."}\n</sessoes>`,
    `<medidas>\n${medidasLinhas.join("\n") || "Sem medidas no período."}\n</medidas>`,
    `<documentos>\n${docsLinhas.join("\n\n") || "Sem documentos com texto."}\n</documentos>`,
    `<conhecimento>\n${conhecimentoLinhas.join("\n\n") || "Sem material relevante na base."}\n</conhecimento>`,
    `Gere o relatório de evolução do período ${period.from ?? "início"} a ${period.to ?? "hoje"}.`,
  ].join("\n\n");

  const snapshot = {
    period,
    assessmentIds: (assessments ?? []).map((a) => a.id),
    sessionIds,
    measurementCount: (measurements ?? []).length,
    conditionCount: (conditions ?? []).length,
    kbChunkIds: kbChunks.map((c) => c.id),
    webUrls: webResults.map((w) => w.url),
  };
  const inputHash = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");

  return { promptUser, snapshot, inputHash, temFotos };
}
