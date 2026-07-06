import { z } from "zod";
import { SEXOS } from "@/lib/labels";

const opcional = (max: number, msg = "Valor muito longo.") =>
  z.string().trim().max(max, msg).optional();

/** Campos do aluno — isomórfico (RHF no client + validação no server). */
export const alunoBaseSchema = z.object({
  fullName: z.string().trim().min(2, "Informe o nome completo."),
  birthDate: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(new Date(v).getTime()), "Data inválida.")
    .refine((v) => !v || new Date(v) <= new Date(), "A data não pode ser no futuro."),
  sex: z.enum(SEXOS).optional(),
  cpf: opcional(14),
  phone: opcional(20),
  email: z
    .string()
    .trim()
    .optional()
    .refine((v) => !v || z.string().email().safeParse(v).success, "E-mail inválido."),
  occupation: opcional(120),
  emergencyContactName: opcional(120),
  emergencyContactPhone: opcional(20),
  generalNotes: z.string().trim().max(2000, "Texto muito longo.").optional(),
});
export type AlunoInput = z.infer<typeof alunoBaseSchema>;

/** No cadastro há registro opcional de consentimento (LGPD). */
export const criarAlunoSchema = alunoBaseSchema.extend({
  consent: z.boolean().optional(),
});
export type CriarAlunoInput = z.infer<typeof criarAlunoSchema>;

export const atualizarAlunoSchema = alunoBaseSchema;
export type AtualizarAlunoInput = z.infer<typeof atualizarAlunoSchema>;
