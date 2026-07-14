import "server-only";
import { createHash } from "node:crypto";
import { LIM_COMPACTO, montarFichaAluna, type Periodo } from "@/lib/ai/dossie";
import { type KbChunk, ragSearch } from "@/lib/ai/rag";
import { buscarWeb, type WebResult } from "@/lib/ai/tavily";
import { createClient } from "@/lib/supabase/server";
import { listEstacoesAtivas } from "@/server/aparelhos";
import { listAlunosDaTurma } from "@/server/turmas";

/** Rótulos estáveis (pseudônimos) — A, B, C, ... até Z. */
const ROTULOS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
const MAX_ALUNAS = 8;

export type AlunaColetiva = { rotulo: string; studentId: string };
export type EstacaoColetiva = { label: string; apparatus: string };

export type DossieColetivo = {
  promptUser: string;
  snapshot: Record<string, unknown>;
  inputHash: string;
  alunos: AlunaColetiva[];
  estacoes: EstacaoColetiva[];
  catalogo: string;
  /** Map aparelho -> nomes de exercícios ativos (para validaRotacao). */
  catalogoPorAparelho: Map<string, Set<string>>;
};

/**
 * Monta o dossiê PSEUDONIMIZADO de uma aula coletiva (turma) para a IA montar o
 * plano com rotação de aparelhos. O mapeamento rotulo→student_id fica SÓ no
 * servidor (em `snapshot`, auditável) — o modelo nunca recebe nomes/CPF/etc.
 * (LGPD — ver 07-lgpd-seguranca.md).
 *
 * Cada aluna vira um bloco `<aluna id="A">…</aluna>` reusando `montarFichaAluna`
 * (compact). O RAG é POR ALUNA: uma busca por aluna (com seus próprios termos
 * técnicos e `studentId`) recupera chunks da KB do aluno + tenant + global; cada
 * bloco traz suas próprias referências `[X-KB-n]`. Uma busca web agregada
 * complementa o `<conhecimento>` geral. Teto de 8 alunas (trunca e avisa).
 */
export async function buildDossieColetivo(params: {
  tenantId: string;
  classGroupId: string;
  classSessionId: string;
  date: string;
  startTime?: string | null;
  durationMin?: number | null;
  onEtapa?: (etapa: "dados" | "base") => void;
  /** Sempre compact na aula coletiva (latência/custo). */
  compact?: true;
}): Promise<DossieColetivo> {
  const { tenantId, classGroupId, classSessionId, date, startTime, durationMin, onEtapa } = params;
  onEtapa?.("dados");

  const supabase = await createClient();

  // --- Alunas da turma + estações ativas (RLS) em paralelo ---
  const [alunosTurma, estacoesAparelhos] = await Promise.all([
    listAlunosDaTurma(classGroupId),
    listEstacoesAtivas(),
  ]);

  // Atribui rótulos estáveis por ordem/joined_at (já ordenado em listAlunosDaTurma).
  const alunosSelecionados = alunosTurma.slice(0, MAX_ALUNAS);
  const truncado = alunosTurma.length > MAX_ALUNAS;
  const alunos: AlunaColetiva[] = alunosSelecionados.map((a, i) => ({
    rotulo: ROTULOS[i] ?? `A${i}`,
    studentId: a.id,
  }));

  const estacoes: EstacaoColetiva[] = estacoesAparelhos.map((e) => ({
    label: e.label,
    apparatus: e.apparatus,
  }));

  // --- Fichas pseudonimizadas de cada aluna, em paralelo (compact) ---
  const period: Periodo = { from: null, to: date };
  const lim = LIM_COMPACTO;
  const fichasBase = await Promise.all(
    alunos.map(async ({ rotulo, studentId }) => {
      const ficha = await montarFichaAluna(studentId, supabase, period, lim);
      return { rotulo, studentId, ficha };
    }),
  );

  // --- RAG por aluna: 1 busca por aluna (KB do aluno + tenant + global), em
  // paralelo. Aumenta `k` para "passar por toda a base". Sem web por aluna
  // (evita N chamadas) — uma busca web agregada complementa o contexto geral.
  onEtapa?.("base");
  const kPorAluna = lim.kbK * 2;
  const [ragPorAluna, webAgregada] = await Promise.all([
    Promise.all(
      fichasBase.map(async (f) => {
        const { nomesCond, queixa, objetivos } = f.ficha.ragTermos;
        const ragQuery =
          `${nomesCond.join(", ")} ${queixa} ${objetivos.join(" ")} pilates exercícios progressão contraindicações segurança`
            .replace(/\s+/g, " ")
            .trim();
        const { kbChunks } = await ragSearch(ragQuery, {
          tenantId,
          studentId: f.studentId,
          k: kPorAluna,
          semWeb: true,
        });
        return { ...f, kbChunks };
      }),
    ),
    buscarWeb(
      `${[...new Set(fichasBase.flatMap((f) => f.ficha.ragTermos.nomesCond))].join(", ")} pilates aula coletiva rotação aparelhos progressão contraindicações segurança`,
    ),
  ]);
  const fichas = ragPorAluna;
  const webResults: WebResult[] = webAgregada;

  // Conhecimento global (web agregada) — referências [WEB-n] compartilhadas.
  const conhecimentoLinhas = webResults.map(
    (w, i) => `[WEB-${i + 1}] ${w.title} (${w.url}): ${w.content.slice(0, 600)}`,
  );

  // --- Catálogo de exercícios ativos por aparelho (a IA só pode usar estes) ---
  const { data: exs } = await supabase
    .from("exercises")
    .select("name, apparatus")
    .eq("is_active", true)
    .order("apparatus")
    .order("name");
  const porAparelho = new Map<string, string[]>();
  for (const e of exs ?? []) {
    const arr = porAparelho.get(e.apparatus) ?? [];
    arr.push(e.name);
    porAparelho.set(e.apparatus, arr);
  }
  const catalogo = [...porAparelho.entries()]
    .map(([ap, nomes]) => `${ap}: ${nomes.join(", ")}`)
    .join("\n");
  const porAparelhoSets = new Map<string, Set<string>>();
  for (const [ap, nomes] of porAparelho) porAparelhoSets.set(ap, new Set(nomes));

  // --- Monta o prompt (alunas só por pseudônimo) ---
  const turmaBloco = fichas
    .map(({ rotulo, ficha, kbChunks: meusKb }) => {
      const kbRefs = meusKb
        .slice(0, lim.kbK)
        .map(
          (c, i) =>
            `[${rotulo}-KB-${i + 1}] ${c.context_header ?? ""}: ${c.content.slice(0, lim.kbChars)}`,
        );
      const linhas = [
        ...ficha.fichaLinhas,
        ...(ficha.sessoesLinhas.length
          ? ["Aulas recentes:", ...ficha.sessoesLinhas]
          : ["Sem aulas registradas."]),
        ...(ficha.medidasLinhas.length ? ["Medidas:", ...ficha.medidasLinhas] : []),
        ...(ficha.docsLinhas.length ? ["Documentos:", ...ficha.docsLinhas] : []),
        ...(kbRefs.length ? ["Conhecimento (próprio da aluna):", ...kbRefs] : []),
      ];
      return `<aluna id="${rotulo}">\n${linhas.join("\n")}\n</aluna>`;
    })
    .join("\n\n");

  const estacoesBloco = estacoes.map((e) => `${e.label} (${e.apparatus})`).join("\n");
  const horarioTxt = startTime
    ? `${startTime.slice(0, 5)}${durationMin ? ` · ${durationMin} min` : ""}`
    : null;

  const promptUser = [
    `<turma>\n${turmaBloco}\n</turma>`,
    `<estacoes>\n${estacoesBloco || "Nenhuma estação ativa cadastrada."}\n</estacoes>`,
    `<catalogo>\n${catalogo}\n</catalogo>`,
    `<conhecimento>\n${conhecimentoLinhas.join("\n\n") || "Sem material web relevante."}\n</conhecimento>`,
    truncado
      ? `OBSERVAÇÃO: a turma tem ${alunosTurma.length} alunas, mas o plano considera apenas as ${MAX_ALUNAS} primeiras (limite operacional).`
      : "",
    `Data da aula: ${date}${horarioTxt ? ` · horário ${horarioTxt}` : ""}. Monte o plano coletivo com rotação de aparelhos conforme as regras. Cada aluna aparece por seu pseudônimo (${alunos.map((a) => a.rotulo).join(", ")}) e traz suas próprias referências [${alunos.map((a) => a.rotulo).join("-KB-n, ")}-KB-n] — use-as para fundamentar os cuidados individuais. NÃO use nomes reais.`,
  ]
    .filter(Boolean)
    .join("\n\n");

  // --- Snapshot (auditável; contém o mapeamento rotulo→student_id, NUNCA enviado ao modelo) ---
  const snapshot = {
    classSessionId,
    classGroupId,
    date,
    alunos: fichas.map((f) => ({
      rotulo: f.rotulo,
      studentId: f.studentId,
      conditionCount: f.ficha.conditionCount,
      sessionIds: f.ficha.sessionIds,
      kbChunkIds: f.kbChunks.map((c: KbChunk) => c.id),
    })),
    alunosTruncados: truncado ? alunosTurma.length : null,
    estacoes: estacoes.map((e) => ({ label: e.label, apparatus: e.apparatus })),
    catalogo,
    webUrls: webResults.map((w) => w.url),
  };
  const inputHash = createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");

  return {
    promptUser,
    snapshot,
    inputHash,
    alunos,
    estacoes,
    catalogo,
    catalogoPorAparelho: porAparelhoSets,
  };
}
