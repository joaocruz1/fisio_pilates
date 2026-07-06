import { z } from "zod";

/** Medidas corporais. Circunferências/flexibilidade viram jsonb no server. */
export const medidaSchema = z.object({
  measuredAt: z
    .string()
    .min(1, "Informe a data.")
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Data inválida."),
  weightKg: z.number().min(0).max(500).optional(),
  heightCm: z.number().min(0).max(300).optional(),
  waistCm: z.number().min(0).max(300).optional(),
  hipCm: z.number().min(0).max(300).optional(),
  rightArmCm: z.number().min(0).max(200).optional(),
  rightThighCm: z.number().min(0).max(200).optional(),
  sitAndReachCm: z.number().min(-50).max(100).optional(),
  notes: z.string().trim().max(1000).optional(),
});
export type MedidaInput = z.infer<typeof medidaSchema>;
