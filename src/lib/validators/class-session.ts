import { z } from "zod";

/** Agendar uma ocorrência (dia/horário) de uma turma. */
export const agendarClassSessionSchema = z.object({
  classGroupId: z.string().uuid("Turma inválida."),
  sessionDate: z
    .string()
    .trim()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use AAAA-MM-DD)."),
  startTime: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}$/, "Horário inválido (use HH:mm)."),
  durationMin: z
    .number()
    .int()
    .min(10, "Duração mínima de 10 minutos.")
    .max(180, "Duração máxima de 180 minutos.")
    .optional(),
  focus: z.string().trim().max(200, "Foco muito longo.").optional(),
});
export type AgendarClassSessionInput = z.infer<typeof agendarClassSessionSchema>;

export const marcarStatusClassSessionSchema = z.object({
  sessionId: z.string().uuid("Sessão inválida."),
  status: z.enum(["scheduled", "completed", "cancelled"]),
});
export type MarcarStatusClassSessionInput = z.infer<typeof marcarStatusClassSessionSchema>;
