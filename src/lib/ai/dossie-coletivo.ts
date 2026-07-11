import "server-only";
import { createHash } from "node:crypto";
import { LIM_COMPACTO, montarFichaAluna, type Periodo } from "@/lib/ai/dossie";
import { ragSearch } from "@/lib/ai/rag";
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
 * (compact). O RAG é AGREGADO: 1 busca a partir da união das condições/queixas de
 * todas, em vez de N buscas. Teto de 8 alunas (trunca e avisa no prompt).
 */
export async function buildDossieColetivo(params: {
  tenantId: string;
  classGroupId: string;
  classSessionId: string;
  date: string;
  onEtapa?: (etapa: "dados" | "base") => void;
  /** Sempre compact na aula coletiva (latência/custo). */
  compact?: true;
}): Promise<DossieColetivo> {
  const { tenantId, classGroupId, classSessionId, date, onEtapa } = params;
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
  const fichas = await Promise.all(
    alunos.map(async ({ rotulo, studentId }) => {
      const ficha = await montarFichaAluna(studentId, supabase, period, lim);
      return { rotulo, studentId, ficha };
    }),
  );

  // --- RAG agregado: 1 busca a partir da união dos termos técnicos ---
  const nomesCond = [...new Set(fichas.flatMap((f) => f.ficha.ragTermos.nomesCond))];
  const queixas = fichas.map((f) => f.ficha.ragTermos.queixa).filter(Boolean);
  const objetivos = [...new Set(fichas.flatMap((f) => f.ficha.ragTermos.objetivos))];
  const ragQuery =
    `${nomesCond.join(", ")} ${queixas.join(" ")} ${objetivos.join(" ")} pilates exercícios progressão contraindicações segurança aula coletiva`
      .replace(/\s+/g, " ")
      .trim();
  onEtapa?.("base");
  const { kbChunks, webResults } = await ragSearch(ragQuery, {
    tenantId,
    k: lim.kbK,
    forcarWeb: true,
  });
  const conhecimentoLinhas = [
    ...kbChunks.map(
      (c, i) => `[KB-${i + 1}] ${c.context_header ?? ""}: ${c.content.slice(0, lim.kbChars)}`,
    ),
    ...webResults.map((w, i) => `[WEB-${i + 1}] ${w.title} (${w.url}): ${w.content.slice(0, 600)}`),
  ];

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
    .map(({ rotulo, ficha }) => {
      const linhas = [
        ...ficha.fichaLinhas,
        ...(ficha.sessoesLinhas.length
          ? ["Aulas recentes:", ...ficha.sessoesLinhas]
          : ["Sem aulas registradas."]),
        ...(ficha.medidasLinhas.length ? ["Medidas:", ...ficha.medidasLinhas] : []),
        ...(ficha.docsLinhas.length ? ["Documentos:", ...ficha.docsLinhas] : []),
      ];
      return `<aluna id="${rotulo}">\n${linhas.join("\n")}\n</aluna>`;
    })
    .join("\n\n");

  const estacoesBloco = estacoes.map((e) => `${e.label} (${e.apparatus})`).join("\n");

  const promptUser = [
    `<turma>\n${turmaBloco}\n</turma>`,
    `<estacoes>\n${estacoesBloco || "Nenhuma estação ativa cadastrada."}\n</estacoes>`,
    `<catalogo>\n${catalogo}\n</catalogo>`,
    `<conhecimento>\n${conhecimentoLinhas.join("\n\n") || "Sem material relevante na base."}\n</conhecimento>`,
    truncado
      ? `OBSERVAÇÃO: a turma tem ${alunosTurma.length} alunas, mas o plano considera apenas as ${MAX_ALUNAS} primeiras (limite operacional).`
      : "",
    `Data da aula: ${date}. Monte o plano coletivo com rotação de aparelhos conforme as regras. Cada aluna aparece por seu pseudônimo (${alunos.map((a) => a.rotulo).join(", ")}); NÃO use nomes reais.`,
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
    })),
    alunosTruncados: truncado ? alunosTurma.length : null,
    estacoes: estacoes.map((e) => ({ label: e.label, apparatus: e.apparatus })),
    catalogo,
    kbChunkIds: kbChunks.map((c) => c.id),
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
