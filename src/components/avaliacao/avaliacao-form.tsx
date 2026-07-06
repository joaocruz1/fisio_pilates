"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { rotuloTipoAvaliacao, TIPOS_AVALIACAO, type TipoAvaliacao } from "@/lib/labels";
import { type AvaliacaoInput, avaliacaoSchema } from "@/lib/validators/avaliacao";
import { atualizarAvaliacao, criarAvaliacao } from "@/server/actions/avaliacoes";
import type { Assessment } from "@/server/assessments";

const hoje = () => new Date().toISOString().slice(0, 10);
const rec = (j: unknown) => (j ?? {}) as Record<string, string | undefined>;
const linhas = (arr: string[] | null | undefined) => (arr ?? []).join("\n");
const paraArray = (s: string) =>
  s
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

export function AvaliacaoForm({
  studentId,
  avaliacao,
}: {
  studentId: string;
  avaliacao?: Assessment;
}) {
  const router = useRouter();
  const editando = Boolean(avaliacao);
  const anam = rec(avaliacao?.anamnesis);
  const post = rec(avaliacao?.postural_assessment);
  const test = rec(avaliacao?.physical_tests);

  const [goalsText, setGoalsText] = useState(linhas(avaliacao?.goals));
  const [contraText, setContraText] = useState(linhas(avaliacao?.contraindications));

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof avaliacaoSchema>, unknown, AvaliacaoInput>({
    resolver: zodResolver(avaliacaoSchema),
    defaultValues: {
      kind: (avaliacao?.kind as TipoAvaliacao) ?? "initial",
      assessedAt: avaliacao?.assessed_at ?? hoje(),
      mainComplaint: avaliacao?.main_complaint ?? "",
      clinicalDiagnosis: avaliacao?.clinical_diagnosis ?? "",
      painLevelInitial: avaliacao?.pain_level_initial ?? undefined,
      goals: [],
      contraindications: [],
      anamnesis: {
        hda: anam.hda ?? "",
        hpp: anam.hpp ?? "",
        medicamentos: anam.medicamentos ?? "",
        cirurgias: anam.cirurgias ?? "",
        habitos: anam.habitos ?? "",
      },
      posturalAssessment: {
        anterior: post.anterior ?? "",
        posterior: post.posterior ?? "",
        lateral: post.lateral ?? "",
      },
      physicalTests: {
        adm: test.adm ?? "",
        forca: test.forca ?? "",
        especiais: test.especiais ?? "",
      },
      notes: avaliacao?.notes ?? "",
    },
  });

  async function onSubmit(values: AvaliacaoInput) {
    const payload: AvaliacaoInput = {
      ...values,
      goals: paraArray(goalsText),
      contraindications: paraArray(contraText),
    };
    const res = avaliacao
      ? await atualizarAvaliacao(avaliacao.id, studentId, payload)
      : await criarAvaliacao(studentId, payload);
    if (res.ok) {
      toast.success(avaliacao ? "Avaliação atualizada." : "Avaliação salva.");
      router.push(`/alunos/${studentId}/avaliacao`);
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <FieldGroup>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="kind">Tipo</FieldLabel>
            <Select
              value={watch("kind")}
              onValueChange={(v) => setValue("kind", v as TipoAvaliacao)}
            >
              <SelectTrigger id="kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_AVALIACAO.map((t) => (
                  <SelectItem key={t} value={t}>
                    {rotuloTipoAvaliacao[t]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="assessedAt">Data</FieldLabel>
            <Input id="assessedAt" type="date" {...register("assessedAt")} />
            <FieldError errors={[errors.assessedAt]} />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="mainComplaint">Queixa principal</FieldLabel>
          <Input id="mainComplaint" {...register("mainComplaint")} />
          <FieldError errors={[errors.mainComplaint]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="clinicalDiagnosis">Diagnóstico clínico</FieldLabel>
          <Input
            id="clinicalDiagnosis"
            placeholder="Se houver encaminhamento"
            {...register("clinicalDiagnosis")}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="painLevelInitial">Dor inicial (EVA 0–10)</FieldLabel>
          <Input
            id="painLevelInitial"
            type="number"
            min={0}
            max={10}
            {...register("painLevelInitial", {
              setValueAs: (v) => (v === "" || v == null ? undefined : Number(v)),
            })}
          />
          <FieldError errors={[errors.painLevelInitial]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="goals">Objetivos (um por linha)</FieldLabel>
          <Textarea
            id="goals"
            rows={3}
            value={goalsText}
            onChange={(e) => setGoalsText(e.target.value)}
            placeholder={"Melhorar postura\nReduzir dor lombar"}
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="contra">Contraindicações (uma por linha)</FieldLabel>
          <Textarea
            id="contra"
            rows={2}
            value={contraText}
            onChange={(e) => setContraText(e.target.value)}
            placeholder={"Flexão de tronco carregada"}
          />
        </Field>
      </FieldGroup>

      <FieldSet className="rounded-lg border p-4">
        <FieldLegend>Anamnese</FieldLegend>
        <FieldGroup className="mt-2">
          <Field>
            <FieldLabel htmlFor="hda">História da doença atual</FieldLabel>
            <Textarea id="hda" rows={2} {...register("anamnesis.hda")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="hpp">História pregressa</FieldLabel>
            <Textarea id="hpp" rows={2} {...register("anamnesis.hpp")} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="medicamentos">Medicamentos</FieldLabel>
              <Textarea id="medicamentos" rows={2} {...register("anamnesis.medicamentos")} />
            </Field>
            <Field>
              <FieldLabel htmlFor="cirurgias">Cirurgias</FieldLabel>
              <Textarea id="cirurgias" rows={2} {...register("anamnesis.cirurgias")} />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="habitos">Hábitos de vida</FieldLabel>
            <Textarea
              id="habitos"
              rows={2}
              placeholder="Atividade física, sono, tabagismo…"
              {...register("anamnesis.habitos")}
            />
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet className="rounded-lg border p-4">
        <FieldLegend>Avaliação postural</FieldLegend>
        <FieldGroup className="mt-2">
          <Field>
            <FieldLabel htmlFor="anterior">Vista anterior</FieldLabel>
            <Textarea id="anterior" rows={2} {...register("posturalAssessment.anterior")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="posterior">Vista posterior</FieldLabel>
            <Textarea id="posterior" rows={2} {...register("posturalAssessment.posterior")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="lateral">Vista lateral</FieldLabel>
            <Textarea id="lateral" rows={2} {...register("posturalAssessment.lateral")} />
          </Field>
        </FieldGroup>
      </FieldSet>

      <FieldSet className="rounded-lg border p-4">
        <FieldLegend>Testes físicos</FieldLegend>
        <FieldGroup className="mt-2">
          <Field>
            <FieldLabel htmlFor="adm">Amplitude de movimento</FieldLabel>
            <Textarea id="adm" rows={2} {...register("physicalTests.adm")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="forca">Força</FieldLabel>
            <Textarea id="forca" rows={2} {...register("physicalTests.forca")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="especiais">Testes especiais</FieldLabel>
            <Textarea id="especiais" rows={2} {...register("physicalTests.especiais")} />
          </Field>
        </FieldGroup>
      </FieldSet>

      <Field>
        <FieldLabel htmlFor="notes">Observações gerais</FieldLabel>
        <Textarea id="notes" rows={3} {...register("notes")} />
      </Field>

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando…" : editando ? "Salvar alterações" : "Salvar avaliação"}
        </Button>
      </div>
    </form>
  );
}
