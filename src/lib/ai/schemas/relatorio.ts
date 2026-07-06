import { z } from "zod";

export const AVISO_IA =
  "Este relatório é um apoio gerado por IA e não substitui a avaliação da fisioterapeuta responsável.";

/** Saída estruturada do relatório de evolução (generateObject). Ver 04-ia.md §2.1. */
export const relatorioSchema = z.object({
  resumo_executivo: z.string().describe("3-5 frases, linguagem clara"),
  evolucao_pilates: z.object({
    progressao_exercicios: z.string(),
    carga_e_complexidade: z.string(),
    aderencia: z.string(),
  }),
  evolucao_corporal: z.object({
    medidas_e_tendencias: z.string(),
    dor_e_queixas: z.string(),
    observacoes_posturais: z.string().nullable(),
  }),
  pontos_de_atencao: z.array(z.string()),
  sugestoes_para_proximas_sessoes: z
    .array(z.string())
    .describe("Sugestões condicionais ao julgamento clínico, nunca prescrições"),
  dados_faltantes: z.array(z.string()),
  aviso: z.literal(AVISO_IA),
});

export type Relatorio = z.infer<typeof relatorioSchema>;
