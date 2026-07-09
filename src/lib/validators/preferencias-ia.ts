import { z } from "zod";

/**
 * Preferências de modelo de IA por feature.
 *
 * Chat e relatório: 3 níveis (economico | balanceado | alta_precisao).
 * Vision: só 2 (sem balanceado — Gemini Flash já é meio-termo e cobre
 *         o tier intermediário; Haiku 4.5 não suporta imagem).
 */
const niveisPadrao = ["economico", "balanceado", "alta_precisao"] as const;
const niveisVision = ["economico", "alta_precisao"] as const;

export const preferenciasIASchema = z.object({
  chat: z.enum(niveisPadrao, {
    message: "Modelo de chat inválido.",
  }),
  report: z.enum(niveisPadrao, {
    message: "Modelo de relatório inválido.",
  }),
  vision: z.enum(niveisVision, {
    message: "Modelo de vision inválido.",
  }),
});

export type PreferenciasIAInput = z.infer<typeof preferenciasIASchema>;
