import { describe, expect, it } from "vitest";
import type { AlunaColetiva, EstacaoColetiva } from "@/lib/ai/dossie-coletivo";
import { validaRotacao } from "@/lib/ai/rotacao";
import type { PlanoAulaGrupo } from "@/lib/ai/schemas/plano-aula-grupo";

const AVISO =
  "Este relatório é um apoio gerado por IA e não substitui a avaliação da fisioterapeuta responsável.";

const alunos: AlunaColetiva[] = [
  { rotulo: "A", studentId: "s1" },
  { rotulo: "B", studentId: "s2" },
  { rotulo: "C", studentId: "s3" },
];

const estacoes: EstacaoColetiva[] = [
  { label: "Reformer 1", apparatus: "reformer" },
  { label: "Chair 1", apparatus: "chair" },
  { label: "Mat 1", apparatus: "mat" },
];

const catalogoOk = new Map<string, Set<string>>([
  ["reformer", new Set(["Footwork", "Hundred"])],
  ["chair", new Set(["Pump Press", "Swan"])],
  ["mat", new Set(["Roll Up", "Spine Stretch"])],
]);

const exercicioPorAparelho: Record<string, string> = {
  reformer: "Footwork",
  chair: "Pump Press",
  mat: "Roll Up",
};

function attr(aluno: string, estacao: string, aparelho: string, exercicio?: string) {
  return {
    aluno_rotulo: aluno,
    estacao_rotulo: estacao,
    aparelho,
    exercicio: exercicio ?? exercicioPorAparelho[aparelho] ?? "Ex",
    series: 3,
    reps: 8,
    carga_molas: null,
    nivel: 2,
    cuidados: [],
  };
}

function plano(blocos: PlanoAulaGrupo["blocos"], numBlocos = blocos.length): PlanoAulaGrupo {
  return {
    foco: "Core",
    duracao_min: 50,
    num_blocos: numBlocos,
    aquecimento: "Mobilidade.",
    blocos,
    justificativa: "...",
    avisos: [],
    aviso: AVISO,
  };
}

describe("validaRotacao", () => {
  it("aceita rotação perfeita: 3 alunas × 3 estações, sem repetir", () => {
    const p = plano([
      {
        ordem: 1,
        duracao_min: 12,
        atribuicoes: [
          attr("A", "Reformer 1", "reformer"),
          attr("B", "Chair 1", "chair"),
          attr("C", "Mat 1", "mat"),
        ],
      },
      {
        ordem: 2,
        duracao_min: 12,
        atribuicoes: [
          attr("A", "Chair 1", "chair"),
          attr("B", "Mat 1", "mat"),
          attr("C", "Reformer 1", "reformer"),
        ],
      },
      {
        ordem: 3,
        duracao_min: 12,
        atribuicoes: [
          attr("A", "Mat 1", "mat"),
          attr("B", "Reformer 1", "reformer"),
          attr("C", "Chair 1", "chair"),
        ],
      },
    ]);
    const r = validaRotacao(p, alunos, estacoes, catalogoOk);
    expect(r.erros).toEqual([]);
    expect(r.avisos).toEqual([]);
    expect(r.ok).toBe(true);
  });

  it("rejeita estação compartilhada dentro do mesmo bloco", () => {
    const p = plano([
      {
        ordem: 1,
        duracao_min: 12,
        atribuicoes: [
          attr("A", "Reformer 1", "reformer"),
          attr("B", "Reformer 1", "reformer"),
          attr("C", "Mat 1", "mat"),
        ],
      },
    ]);
    const r = validaRotacao(p, alunos, estacoes, catalogoOk);
    expect(r.ok).toBe(false);
    expect(r.erros.some((e) => e.includes("Reformer 1") && e.includes("compartilhada"))).toBe(true);
  });

  it("rejeita aluna repetida no mesmo bloco", () => {
    const p = plano([
      {
        ordem: 1,
        duracao_min: 12,
        atribuicoes: [
          attr("A", "Reformer 1", "reformer"),
          attr("A", "Chair 1", "chair"),
          attr("B", "Mat 1", "mat"),
        ],
      },
    ]);
    const r = validaRotacao(p, alunos, estacoes, catalogoOk);
    expect(r.ok).toBe(false);
    expect(r.erros.some((e) => e.includes('"A"') && e.includes("mais de uma vez"))).toBe(true);
  });

  it("rejeita aluna faltante em um bloco", () => {
    const p = plano([
      {
        ordem: 1,
        duracao_min: 12,
        atribuicoes: [attr("A", "Reformer 1", "reformer"), attr("B", "Chair 1", "chair")],
      },
    ]);
    const r = validaRotacao(p, alunos, estacoes, catalogoOk);
    expect(r.ok).toBe(false);
    expect(r.erros.some((e) => e.includes('"C"') && e.includes("não tem atribuição"))).toBe(true);
  });

  it("rejeita rótulo de aluna inexistente", () => {
    const p = plano([
      {
        ordem: 1,
        duracao_min: 12,
        atribuicoes: [
          attr("A", "Reformer 1", "reformer"),
          attr("B", "Chair 1", "chair"),
          attr("Z", "Mat 1", "mat"),
        ],
      },
    ]);
    const r = validaRotacao(p, alunos, estacoes, catalogoOk);
    expect(r.ok).toBe(false);
    expect(r.erros.some((e) => e.includes('"Z"') && e.includes("não está na turma"))).toBe(true);
  });

  it("rejeita aparelho informado diferente do real da estação", () => {
    const p = plano([
      {
        ordem: 1,
        duracao_min: 12,
        atribuicoes: [
          attr("A", "Reformer 1", "chair"),
          attr("B", "Chair 1", "chair"),
          attr("C", "Mat 1", "mat"),
        ],
      },
    ]);
    const r = validaRotacao(p, alunos, estacoes, catalogoOk);
    expect(r.ok).toBe(false);
    expect(r.erros.some((e) => e.includes("Reformer 1") && e.includes("chair"))).toBe(true);
  });

  it("avisa quando exercício não está no catálogo do aparelho", () => {
    const p = plano([
      {
        ordem: 1,
        duracao_min: 12,
        atribuicoes: [
          attr("A", "Reformer 1", "reformer", "Inexistente"),
          attr("B", "Chair 1", "chair"),
          attr("C", "Mat 1", "mat"),
        ],
      },
    ]);
    const r = validaRotacao(p, alunos, estacoes, catalogoOk);
    expect(r.ok).toBe(true);
    expect(r.avisos.some((a) => a.includes("Inexistente"))).toBe(true);
  });

  it("avisa quando aluna repete estação antes de visitar todas", () => {
    const p = plano([
      {
        ordem: 1,
        duracao_min: 12,
        atribuicoes: [
          attr("A", "Reformer 1", "reformer"),
          attr("B", "Chair 1", "chair"),
          attr("C", "Mat 1", "mat"),
        ],
      },
      {
        ordem: 2,
        duracao_min: 12,
        atribuicoes: [
          attr("A", "Reformer 1", "reformer"),
          attr("B", "Mat 1", "mat"),
          attr("C", "Chair 1", "chair"),
        ],
      },
      {
        ordem: 3,
        duracao_min: 12,
        atribuicoes: [
          attr("A", "Chair 1", "chair"),
          attr("B", "Reformer 1", "reformer"),
          attr("C", "Reformer 1", "reformer"),
        ],
      },
    ]);
    const r = validaRotacao(p, alunos, estacoes, catalogoOk);
    // A repetiu Reformer 1 no bloco 2 antes de visitar Chair/Mat.
    expect(r.avisos.some((a) => a.includes('"A"') && a.includes("repetiu estação"))).toBe(true);
  });

  it("avisa quando num_blocos difere do total de blocos", () => {
    const p = plano(
      [
        {
          ordem: 1,
          duracao_min: 12,
          atribuicoes: [
            attr("A", "Reformer 1", "reformer"),
            attr("B", "Chair 1", "chair"),
            attr("C", "Mat 1", "mat"),
          ],
        },
      ],
      3,
    );
    const r = validaRotacao(p, alunos, estacoes, catalogoOk);
    expect(r.avisos.some((a) => a.includes("num_blocos"))).toBe(true);
  });
});
