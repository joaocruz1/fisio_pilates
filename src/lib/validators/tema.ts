import { z } from "zod";

export const TEMAS = ["light", "dark", "system"] as const;

export const temaSchema = z.object({
  tema: z.enum(TEMAS, { message: "Tema inválido." }),
});

export type Tema = (typeof TEMAS)[number];
export type TemaInput = z.infer<typeof temaSchema>;
