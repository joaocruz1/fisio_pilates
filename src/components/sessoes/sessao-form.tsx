"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowCounterClockwiseIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { APARELHOS, type Aparelho, rotuloAparelho } from "@/lib/labels";
import { type SessaoInput, sessaoSchema } from "@/lib/validators/sessao";
import { criarSessao } from "@/server/actions/sessoes";
import type { Exercise } from "@/server/exercises";

type FormInput = z.input<typeof sessaoSchema>;
const hoje = () => new Date().toISOString().slice(0, 10);
const numero = { setValueAs: (v: string) => (v === "" || v == null ? undefined : Number(v)) };

export type UltimaSessao = {
  focus: string | null;
  exercises: {
    exerciseId: string;
    sets: number | null;
    reps: number | null;
    loadSprings: string | null;
    resistanceLevel: number | null;
  }[];
};

const linhaVazia = () => ({
  exerciseId: "",
  sets: undefined,
  reps: undefined,
  loadSprings: "",
  resistanceLevel: undefined,
  notes: "",
});

export function SessaoForm({
  studentId,
  exercises,
  ultimaSessao,
}: {
  studentId: string;
  exercises: Exercise[];
  ultimaSessao: UltimaSessao | null;
}) {
  const router = useRouter();
  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormInput, unknown, SessaoInput>({
    resolver: zodResolver(sessaoSchema),
    defaultValues: {
      sessionDate: hoje(),
      status: "completed",
      focus: "",
      notes: "",
      exercises: [linhaVazia()],
    },
  });
  const { fields, append, remove, replace } = useFieldArray({ control, name: "exercises" });

  function repetirUltima() {
    if (!ultimaSessao || ultimaSessao.exercises.length === 0) return;
    replace(
      ultimaSessao.exercises.map((e) => ({
        exerciseId: e.exerciseId,
        sets: e.sets ?? undefined,
        reps: e.reps ?? undefined,
        loadSprings: e.loadSprings ?? "",
        resistanceLevel: e.resistanceLevel ?? undefined,
        notes: "",
      })),
    );
    if (ultimaSessao.focus) setValue("focus", ultimaSessao.focus);
    toast.info("Exercícios da última sessão carregados.");
  }

  async function onSubmit(values: SessaoInput) {
    const limpo: SessaoInput = {
      ...values,
      exercises: values.exercises.filter((e) => e.exerciseId),
    };
    const res = await criarSessao(studentId, limpo);
    if (res.ok) {
      toast.success("Sessão registrada.");
      router.push(`/alunos/${studentId}/sessoes`);
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
            <FieldLabel htmlFor="sessionDate">Data</FieldLabel>
            <Input id="sessionDate" type="date" {...register("sessionDate")} />
            <FieldError errors={[errors.sessionDate]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="durationMin">Duração (min)</FieldLabel>
            <Input id="durationMin" type="number" min={0} {...register("durationMin", numero)} />
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="focus">Foco da aula</FieldLabel>
          <Input id="focus" placeholder="Ex.: core + mobilidade torácica" {...register("focus")} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor="painPre">Dor antes (0–10)</FieldLabel>
            <Input
              id="painPre"
              type="number"
              min={0}
              max={10}
              {...register("painLevelPre", numero)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="painPost">Dor depois (0–10)</FieldLabel>
            <Input
              id="painPost"
              type="number"
              min={0}
              max={10}
              {...register("painLevelPost", numero)}
            />
          </Field>
        </div>
      </FieldGroup>

      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Exercícios</h2>
          {ultimaSessao && ultimaSessao.exercises.length > 0 ? (
            <Button type="button" size="sm" variant="outline" onClick={repetirUltima}>
              <ArrowCounterClockwiseIcon className="size-4" /> Repetir última sessão
            </Button>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          {fields.map((field, i) => (
            <div key={field.id} className="rounded-lg border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-muted-foreground">#{i + 1}</span>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Remover exercício"
                  onClick={() => remove(i)}
                >
                  <TrashIcon className="size-4" />
                </Button>
              </div>
              <Controller
                control={control}
                name={`exercises.${i}.exerciseId`}
                render={({ field: f }) => (
                  <Select value={f.value} onValueChange={f.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o exercício" />
                    </SelectTrigger>
                    <SelectContent>
                      {APARELHOS.map((ap) => {
                        const doAparelho = exercises.filter((e) => e.apparatus === ap);
                        if (doAparelho.length === 0) return null;
                        return (
                          <SelectGroup key={ap}>
                            <SelectLabel>{rotuloAparelho[ap as Aparelho]}</SelectLabel>
                            {doAparelho.map((e) => (
                              <SelectItem key={e.id} value={e.id}>
                                {e.name}
                              </SelectItem>
                            ))}
                          </SelectGroup>
                        );
                      })}
                    </SelectContent>
                  </Select>
                )}
              />
              <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div>
                  <FieldLabel className="text-xs">Séries</FieldLabel>
                  <Input type="number" min={0} {...register(`exercises.${i}.sets`, numero)} />
                </div>
                <div>
                  <FieldLabel className="text-xs">Reps</FieldLabel>
                  <Input type="number" min={0} {...register(`exercises.${i}.reps`, numero)} />
                </div>
                <div>
                  <FieldLabel className="text-xs">Molas/carga</FieldLabel>
                  <Input placeholder="2 verm." {...register(`exercises.${i}.loadSprings`)} />
                </div>
                <div>
                  <FieldLabel className="text-xs">Nível (1–5)</FieldLabel>
                  <Input
                    type="number"
                    min={1}
                    max={5}
                    {...register(`exercises.${i}.resistanceLevel`, numero)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button type="button" variant="outline" onClick={() => append(linhaVazia())}>
          <PlusIcon className="size-4" /> Adicionar exercício
        </Button>
      </section>

      <Field>
        <FieldLabel htmlFor="notes">Observações da sessão</FieldLabel>
        <Textarea id="notes" rows={3} {...register("notes")} />
      </Field>

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando…" : "Salvar sessão"}
        </Button>
      </div>
    </form>
  );
}
