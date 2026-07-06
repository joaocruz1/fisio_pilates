import { z } from "zod";
import { TIPOS_AVALIACAO } from "@/lib/labels";

const textoOpc = (max = 2000) => z.string().trim().max(max, "Texto muito longo.").optional();

/** Seções semi-estruturadas (armazenadas como jsonb). Schemas versionados. */
export const anamneseSchema = z
  .object({
    hda: textoOpc(), // história da doença atual
    hpp: textoOpc(), // história pregressa
    medicamentos: textoOpc(1000),
    cirurgias: textoOpc(1000),
    habitos: textoOpc(1000), // atividade física, sono, tabagismo…
  })
  .default({});

export const posturalSchema = z
  .object({
    anterior: textoOpc(1500),
    posterior: textoOpc(1500),
    lateral: textoOpc(1500),
  })
  .default({});

export const testesSchema = z
  .object({
    adm: textoOpc(1500), // amplitude de movimento
    forca: textoOpc(1500),
    especiais: textoOpc(1500),
  })
  .default({});

export const avaliacaoSchema = z.object({
  kind: z.enum(TIPOS_AVALIACAO).default("initial"),
  assessedAt: z
    .string()
    .min(1, "Informe a data.")
    .refine((v) => !Number.isNaN(new Date(v).getTime()), "Data inválida."),
  mainComplaint: textoOpc(1000),
  clinicalDiagnosis: textoOpc(1000),
  goals: z.array(z.string().trim().min(1)).default([]),
  contraindications: z.array(z.string().trim().min(1)).default([]),
  painLevelInitial: z.number().int().min(0).max(10).optional(),
  anamnesis: anamneseSchema,
  posturalAssessment: posturalSchema,
  physicalTests: testesSchema,
  notes: textoOpc(2000),
});
export type AvaliacaoInput = z.infer<typeof avaliacaoSchema>;
