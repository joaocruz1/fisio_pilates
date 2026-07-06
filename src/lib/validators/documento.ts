import { z } from "zod";
import { DOC_KINDS } from "@/lib/labels";

export const documentoMetaSchema = z.object({
  kind: z.enum(DOC_KINDS).default("other"),
  takenAt: z
    .string()
    .optional()
    .refine((v) => !v || !Number.isNaN(new Date(v).getTime()), "Data inválida."),
  description: z.string().trim().max(500, "Texto muito longo.").optional(),
});
export type DocumentoMetaInput = z.infer<typeof documentoMetaSchema>;
