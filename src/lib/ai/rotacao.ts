import type { AlunaColetiva, EstacaoColetiva } from "@/lib/ai/dossie-coletivo";
import type { PlanoAulaGrupo } from "@/lib/ai/schemas/plano-aula-grupo";

export type ResultadoRotacao = { ok: boolean; erros: string[]; avisos: string[] };

/**
 * Valida a estrutura de rotação do plano de aula coletiva gerado pela IA.
 *
 * Estratégia "avisar, não regenerar": `erros` tornam o plano inválido (a rota
 * registra `error_message` e avisa o cliente, mas mantém o `structured` para
 * revisão); `avisos` são não-fatais (banner ao usuário, plano ainda é salvo).
 *
 * Conferências:
 *  (1) `num_blocos` coerente com `blocos.length` — aviso.
 *  (2) `aluno_rotulo`/`estacao_rotulo` pertencem aos conjuntos válidos — erro.
 *  (3) cada aluna aparece exatamente 1x em cada bloco — erro.
 *  (4) estação única por bloco (sem duas alunas na mesma estação) — erro.
 *  (5) rotação: aluna não repete estação entre blocos — aviso.
 *  (6) exercício pertence ao catálogo do aparelho informado — aviso.
 *  (7) `aparelho` informado bate com o aparelho real da estação — erro.
 */
export function validaRotacao(
  plano: PlanoAulaGrupo,
  alunos: AlunaColetiva[],
  estacoes: EstacaoColetiva[],
  catalogo: Map<string, Set<string>>,
): ResultadoRotacao {
  const erros: string[] = [];
  const avisos: string[] = [];

  const rotulosAlunas = new Set(alunos.map((a) => a.rotulo));
  const estacaoPorRotulo = new Map(estacoes.map((e) => [e.label, e.apparatus]));
  const rotulosEstacoes = new Set(estacaoPorRotulo.keys());

  // (1) coerência num_blocos vs blocos.length
  if (plano.num_blocos !== plano.blocos.length) {
    avisos.push(
      `num_blocos (${plano.num_blocos}) difere do total de blocos (${plano.blocos.length}).`,
    );
  }

  // Per-bloco: rótulos válidos, uma aluna por estação, cada aluna exatamente 1x.
  const estacoesPorAluna = new Map<string, Set<string>>(); // rotulo -> estações visitadas
  for (const rot of rotulosAlunas) estacoesPorAluna.set(rot, new Set());

  plano.blocos.forEach((bloco, bi) => {
    const alunasNoBloco = new Set<string>();
    const estacoesNoBloco = new Map<string, number>(); // rotulo estação -> count

    for (const attr of bloco.atribuicoes) {
      // (2) rótulos válidos
      if (!rotulosAlunas.has(attr.aluno_rotulo)) {
        erros.push(`Bloco ${bi + 1}: aluna "${attr.aluno_rotulo}" não está na turma.`);
      }
      if (!rotulosEstacoes.has(attr.estacao_rotulo)) {
        erros.push(`Bloco ${bi + 1}: estação "${attr.estacao_rotulo}" não existe no estúdio.`);
        continue; // sem apparatus para conferir
      }

      // (3) cada aluna exatamente 1x por bloco
      if (alunasNoBloco.has(attr.aluno_rotulo)) {
        erros.push(`Bloco ${bi + 1}: aluna "${attr.aluno_rotulo}" aparece mais de uma vez.`);
      } else {
        alunasNoBloco.add(attr.aluno_rotulo);
      }

      // (4) estação única por bloco (sem compartilhar)
      const cnt = (estacoesNoBloco.get(attr.estacao_rotulo) ?? 0) + 1;
      estacoesNoBloco.set(attr.estacao_rotulo, cnt);
      if (cnt > 1) {
        erros.push(
          `Bloco ${bi + 1}: estação "${attr.estacao_rotulo}" compartilhada por duas alunas.`,
        );
      }

      // (7) aparelho informado bate com o real da estação
      const aparelhoReal = estacaoPorRotulo.get(attr.estacao_rotulo);
      if (aparelhoReal && attr.aparelho !== aparelhoReal) {
        erros.push(
          `Bloco ${bi + 1}: estação "${attr.estacao_rotulo}" é ${aparelhoReal}, mas a atribuição informa "${attr.aparelho}".`,
        );
      }

      // (6) exercício pertence ao catálogo do aparelho
      const nomes = catalogo.get(attr.aparelho);
      if (attr.exercicio && nomes && !nomes.has(attr.exercicio)) {
        avisos.push(
          `Bloco ${bi + 1}: exercício "${attr.exercicio}" não está no catálogo de ${attr.aparelho}.`,
        );
      }

      // registra visita para (5)
      estacoesPorAluna.get(attr.aluno_rotulo)?.add(attr.estacao_rotulo);
    }

    // (3 complemento) toda aluna da turma aparece no bloco
    for (const rot of rotulosAlunas) {
      if (!alunasNoBloco.has(rot)) {
        erros.push(`Bloco ${bi + 1}: aluna "${rot}" não tem atribuição neste bloco.`);
      }
    }
  });

  // (5) rotação: aluna não deve repetir estação enquanto há estações não visitadas.
  // Em `b` blocos com `e` estações, o esperado é visitar min(b, e) estações distintas;
  // menos que isso indica repetição precoce.
  const esperadoDistintas = Math.min(plano.blocos.length, rotulosEstacoes.size);
  for (const [rot, visitadas] of estacoesPorAluna) {
    if (visitadas.size < esperadoDistintas) {
      avisos.push(
        `Aluna "${rot}" repetiu estação antes de visitar todas as ${rotulosEstacoes.size} disponíveis.`,
      );
    }
  }

  return { ok: erros.length === 0, erros, avisos };
}
