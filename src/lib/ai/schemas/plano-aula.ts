import { z } from "zod";
import { AVISO_IA } from "@/lib/ai/schemas/relatorio";

/**
 * Plano estruturado da próxima aula (generateObject). Exercícios escolhidos do catálogo.
 *
 * IMPORTANTE: NÃO usar `z.number().int()` — no Zod 4 o `.int()` emite
 * `minimum`/`maximum` (o range de inteiro seguro) no JSON Schema, e a saída
 * estruturada do Anthropic (via OpenRouter) rejeita `minimum`/`maximum` em tipo
 * `integer`. Usamos `z.number()` puro e indicamos "inteiro" no `.describe()`.
 * Pelo mesmo motivo, o array de exercícios não usa `.min()` (evita `minItems`);
 * a exigência de ao menos um exercício é reforçada no prompt.
 */
export const planoAulaSchema = z.object({
  foco: z.string().describe("Foco da próxima aula, ex.: 'Core + mobilidade torácica'"),
  duracao_sugerida_min: z
    .number()
    .nullable()
    .describe("Duração sugerida em minutos, inteiro (tipicamente entre 20 e 120)"),
  aquecimento: z.string(),
  exercicios: z.array(
    z.object({
      nome: z.string().describe("Nome EXATO de um exercício da lista fornecida no <catalogo>"),
      aparelho: z.string(),
      series: z.number().nullable().describe("Número de séries, inteiro (tipicamente 1 a 10)"),
      reps: z.number().nullable().describe("Repetições por série, inteiro (tipicamente 1 a 50)"),
      carga_molas: z
        .string()
        .nullable()
        .describe("Ex.: '2 vermelhas + 1 azul' ou orientação de resistência"),
      nivel: z
        .number()
        .nullable()
        .describe("Resistência/intensidade, inteiro de 1 (leve) a 5 (intensa)"),
      progressao: z.string().describe("Como progredir/regredir conforme a resposta"),
      cuidados: z.array(z.string()),
    }),
  ),
  avisos_para_sessao: z.array(z.string()),
  justificativa: z
    .string()
    .describe("Por que este plano, citando o histórico do aluno e a base de conhecimento"),
  aviso: z.literal(AVISO_IA),
});

export type PlanoAula = z.infer<typeof planoAulaSchema>;
