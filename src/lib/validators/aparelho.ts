import { z } from "zod";
import { APARELHOS, STATUS_APARELHO } from "@/lib/labels";

/** Aparelho físico do estúdio — isomórfico (RHF no client + validação no server). */
export const aparelhoBaseSchema = z.object({
  label: z
    .string()
    .trim()
    .min(2, "Informe um rótulo (ex.: 'Reformer 1').")
    .max(60, "Rótulo muito longo."),
  apparatus: z.enum(APARELHOS, { message: "Selecione o tipo de aparelho." }),
  status: z.enum(STATUS_APARELHO).optional(),
  notes: z.string().trim().max(2000, "Texto muito longo.").optional(),
});
export type AparelhoInput = z.infer<typeof aparelhoBaseSchema>;

export const criarAparelhoSchema = aparelhoBaseSchema;
export type CriarAparelhoInput = z.infer<typeof criarAparelhoSchema>;

export const atualizarAparelhoSchema = aparelhoBaseSchema;
export type AtualizarAparelhoInput = z.infer<typeof atualizarAparelhoSchema>;
