import { z } from "zod";
import { AVISO_IA } from "@/lib/ai/schemas/relatorio";

/**
 * Plano estruturado de uma AULA COLETIVA (turma) com rotação de aparelhos.
 *
 * IMPORTANTE (zod 4 + structured output Anthropic, ver comentário em
 * plano-aula.ts): NÃO usar `z.number().int()`, nem `.min()`/`.max()` em números
 * ou arrays — isso emite `minimum`/`maximum`/`minItems` no JSON Schema, que a
 * saída estruturada do Anthropic (via OpenRouter) rejeita em tipo `integer`.
 * Usamos `z.number()` puro e indicamos "inteiro (...)" no `.describe()`.
 *
 * LGPD: o modelo só vê PSEUDÔNIMOS (`aluno_rotulo` = "A"/"B"/...). O
 * mapeamento rotulo→student_id fica no servidor (input_snapshot), nunca no
 * schema nem na resposta.
 */
export const atribuicaoSchema = z.object({
  aluno_rotulo: z
    .string()
    .describe(
      'Pseudônimo da aluna neste bloco, ex.: "A", "B", "C" (um dos rótulos do bloco <turma>)',
    ),
  estacao_rotulo: z
    .string()
    .describe('Rótulo da estação (unidade de aparelho) do bloco <estacoes>, ex.: "Reformer 1"'),
  aparelho: z.string().describe("Tipo do aparelho da estação, ex.: reformer, mat, chair"),
  exercicio: z
    .string()
    .describe("Nome EXATO de um exercício do <catalogo> para o aparelho da estação"),
  series: z.number().nullable().describe("Número de séries, inteiro (tipicamente 1 a 6)"),
  reps: z.number().nullable().describe("Repetições por série, inteiro (tipicamente 1 a 20)"),
  carga_molas: z
    .string()
    .nullable()
    .describe("Ex.: '2 vermelhas + 1 azul' ou orientação de resistência"),
  nivel: z
    .number()
    .nullable()
    .describe("Resistência/intensidade, inteiro de 1 (leve) a 5 (intensa)"),
  cuidados: z
    .array(z.string())
    .describe(
      "Cuidados específicos da aluna nesta estação, máx 2 itens (cite [KB-n] se vier da base)",
    ),
});

export const blocoSchema = z.object({
  ordem: z.number().describe("Ordem do bloco/rodada na aula, inteiro (1, 2, 3, ...)"),
  duracao_min: z
    .number()
    .nullable()
    .describe("Duração do bloco em minutos, inteiro (tipicamente 8 a 15)"),
  atribuicoes: z
    .array(atribuicaoSchema)
    .describe(
      "Uma atribuição por aluna neste bloco: cada aluna em exatamente UMA estação, sem duas alunas na mesma estação dentro do bloco.",
    ),
});

export const planoAulaGrupoSchema = z.object({
  foco: z.string().describe("Foco da aula coletiva, ex.: 'Core + mobilidade torácica'"),
  duracao_min: z
    .number()
    .nullable()
    .describe("Duração total da aula em minutos, inteiro (tipicamente 40 a 60)"),
  num_blocos: z
    .number()
    .describe(
      "Número de blocos/rodadas. DEVE ser igual ao número de estações ativas e ao comprimento de `blocos`.",
    ),
  aquecimento: z
    .string()
    .describe("Aquecimento coletivo inicial, 1 a 2 frases (geralmente no solo/mat)"),
  blocos: z
    .array(blocoSchema)
    .describe(
      "Blocos/rodadas da aula. Nenhum bloco pode ter a mesma estação para duas alunas, e cada aluna deve rotacionar de estação entre blocos.",
    ),
  justificativa: z
    .string()
    .describe(
      "Por que esta sequência e rotação, citando condições/contraindicações das alunas e 1–2 referências [KB-n]. Máx 4 frases.",
    ),
  avisos: z
    .array(z.string())
    .describe("Avisos gerais para a aula coletiva, máx 4 itens (contraindicações cruzadas, etc.)"),
  aviso: z.literal(AVISO_IA),
});

export type PlanoAulaGrupo = z.infer<typeof planoAulaGrupoSchema>;
export type Atribuicao = z.infer<typeof atribuicaoSchema>;
export type Bloco = z.infer<typeof blocoSchema>;
