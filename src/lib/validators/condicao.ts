import { z } from "zod";
import { SEVERIDADES, STATUS_CONDICAO } from "@/lib/labels";

export const condicaoSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da condição."),
  cidCode: z.string().trim().max(10, "CID inválido.").optional(),
  status: z.enum(STATUS_CONDICAO).default("active"),
  severity: z.enum(SEVERIDADES).optional(),
  diagnosedAt: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(new Date(v).getTime()), "Data inválida."),
  notes: z.string().trim().max(1000, "Texto muito longo.").optional(),
});
export type CondicaoInput = z.infer<typeof condicaoSchema>;
