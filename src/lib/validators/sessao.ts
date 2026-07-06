import { z } from "zod";
import { STATUS_SESSAO } from "@/lib/labels";

export const exercicioSessaoSchema = z.object({
  exerciseId: z.string().uuid("Selecione um exercício."),
  sets: z.number().int().min(0).max(99).optional(),
  reps: z.number().int().min(0).max(999).optional(),
  loadSprings: z.string().trim().max(60).optional(),
  resistanceLevel: z.number().int().min(1).max(5).optional(),
  difficultyFelt: z.number().int().min(1).max(5).optional(),
  qualityRating: z.number().int().min(1).max(5).optional(),
  notes: z.string().trim().max(500).optional(),
});
export type ExercicioSessaoInput = z.infer<typeof exercicioSessaoSchema>;

export const sessaoSchema = z.object({
  sessionDate: z
    .string()
    .min(1, "Informe a data.")
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Data inválida."),
  durationMin: z.number().int().min(0).max(600).optional(),
  status: z.enum(STATUS_SESSAO).default("completed"),
  painLevelPre: z.number().int().min(0).max(10).optional(),
  painLevelPost: z.number().int().min(0).max(10).optional(),
  focus: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(2000).optional(),
  exercises: z.array(exercicioSessaoSchema).default([]),
});
export type SessaoInput = z.infer<typeof sessaoSchema>;
