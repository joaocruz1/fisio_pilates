import { z } from "zod";

/** Turma (aula coletiva) — isomórfico (RHF no client + validação no server). */
export const turmaBaseSchema = z.object({
  name: z.string().trim().min(2, "Informe o nome da turma.").max(80, "Nome muito longo."),
  notes: z.string().trim().max(2000, "Texto muito longo.").optional(),
  defaultDurationMin: z
    .number()
    .int("Duração inválida.")
    .min(10, "Duração mínima de 10 minutos.")
    .max(180, "Duração máxima de 180 minutos.")
    .optional(),
  maxStudents: z
    .number()
    .int("Número inválido.")
    .min(1, "Mínimo de 1 aluno.")
    .max(20, "Máximo de 20 alunos.")
    .optional(),
  weekday: z.number().int().min(0).max(6).nullable().optional(),
  startTime: z
    .string()
    .trim()
    .regex(/^\d{2}:\d{2}$/, "Horário inválido (use HH:mm).")
    .nullable()
    .optional(),
  status: z.enum(["active", "archived"]).optional(),
});
export type TurmaInput = z.infer<typeof turmaBaseSchema>;

export const criarTurmaSchema = turmaBaseSchema;
export type CriarTurmaInput = z.infer<typeof criarTurmaSchema>;

export const atualizarTurmaSchema = turmaBaseSchema;
export type AtualizarTurmaInput = z.infer<typeof atualizarTurmaSchema>;

/** Adicionar um aluno existente à turma. */
export const adicionarAlunoSchema = z.object({
  studentId: z.string().uuid("Selecione um aluno."),
  ordem: z.number().int().min(0).optional(),
});
export type AdicionarAlunoInput = z.infer<typeof adicionarAlunoSchema>;
