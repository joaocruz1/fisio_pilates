import { z } from "zod";

/** Perfil da profissional — usado no onboarding e na edição em Configurações. */
export const onboardingSchema = z.object({
  fullName: z.string().trim().min(2, "Informe seu nome completo."),
  studioName: z.string().trim().max(120, "Nome do estúdio muito longo.").optional(),
  crefito: z.string().trim().max(40, "CREFITO inválido.").optional(),
  phone: z.string().trim().max(20, "Telefone inválido.").optional(),
});
export type OnboardingInput = z.infer<typeof onboardingSchema>;

// Edição de perfil reusa exatamente os mesmos campos.
export const perfilSchema = onboardingSchema;
export type PerfilInput = OnboardingInput;
