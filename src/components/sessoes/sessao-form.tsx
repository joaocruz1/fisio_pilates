"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowCounterClockwiseIcon,
  BarbellIcon,
  CalendarBlankIcon,
  FloppyDiskIcon,
  type Icon,
  NotePencilIcon,
  PlusIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { Controller, useFieldArray, useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { VideoExercicio } from "@/components/exercicios/video-exercicio";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldLabel } from "@/components/ui/field";
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

function linhasDe(u: UltimaSessao) {
  return u.exercises.map((e) => ({
    exerciseId: e.exerciseId,
    sets: e.sets ?? undefined,
    reps: e.reps ?? undefined,
    loadSprings: e.loadSprings ?? "",
    resistanceLevel: e.resistanceLevel ?? undefined,
    notes: "",
  }));
}

/** Cabeçalho de seção do formulário (ícone + título + ação opcional). */
function Secao({
  icon: Icon,
  titulo,
  descricao,
  acao,
  children,
}: {
  icon: Icon;
  titulo: string;
  descricao?: string;
  acao?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border bg-card p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="size-4" weight="fill" />
          </span>
          <div>
            <h2 className="font-heading text-sm font-semibold leading-tight">{titulo}</h2>
            {descricao ? <p className="text-xs text-muted-foreground">{descricao}</p> : null}
          </div>
        </div>
        {acao}
      </div>
      {children}
    </section>
  );
}

export function SessaoForm({
  studentId,
  exercises,
  ultimaSessao,
  prefill,
  appointmentId,
  defaultDate,
}: {
  studentId: string;
  exercises: Exercise[];
  ultimaSessao: UltimaSessao | null;
  prefill?: UltimaSessao | null;
  appointmentId?: string | null;
  defaultDate?: string | null;
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
      sessionDate: defaultDate || hoje(),
      status: "completed",
      focus: prefill?.focus ?? "",
      notes: "",
      exercises: prefill?.exercises.length ? linhasDe(prefill) : [linhaVazia()],
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
    toast.info("Exercícios da última aula carregados.");
  }

  async function onSubmit(values: SessaoInput) {
    const limpo: SessaoInput = {
      ...values,
      exercises: values.exercises.filter((e) => e.exerciseId),
    };
    const res = await criarSessao(studentId, limpo, appointmentId ?? null);
    if (res.ok) {
      toast.success(
        appointmentId ? "Aula registrada e agendamento concluído." : "Aula registrada.",
      );
      router.push(appointmentId ? "/agenda" : `/alunos/${studentId}/sessoes`);
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      {/* Informações da aula */}
      <Secao
        icon={CalendarBlankIcon}
        titulo="Informações da aula"
        descricao="Quando foi, o foco do trabalho e a dor relatada."
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="sessionDate">Data</FieldLabel>
              <Input id="sessionDate" type="date" {...register("sessionDate")} />
              <FieldError errors={[errors.sessionDate]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="durationMin">Duração (min)</FieldLabel>
              <Input
                id="durationMin"
                type="number"
                min={0}
                placeholder="50"
                {...register("durationMin", numero)}
              />
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="focus">Foco da aula</FieldLabel>
            <Input
              id="focus"
              placeholder="Ex.: core + mobilidade torácica"
              {...register("focus")}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="painPre">Dor antes (0–10)</FieldLabel>
              <Input
                id="painPre"
                type="number"
                min={0}
                max={10}
                placeholder="0 = sem dor"
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
                placeholder="10 = máxima"
                {...register("painLevelPost", numero)}
              />
            </Field>
          </div>
        </div>
      </Secao>

      {/* Exercícios */}
      <Secao
        icon={BarbellIcon}
        titulo="Exercícios"
        descricao="Escolha do catálogo e ajuste séries, repetições, molas e nível."
        acao={
          ultimaSessao && ultimaSessao.exercises.length > 0 ? (
            <Button type="button" size="sm" variant="outline" onClick={repetirUltima}>
              <ArrowCounterClockwiseIcon className="size-4" /> Repetir última aula
            </Button>
          ) : null
        }
      >
        <div className="flex flex-col gap-3">
          {fields.map((field, i) => (
            <div key={field.id} className="rounded-lg border bg-background/60 p-3">
              <div className="flex items-center gap-2">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                  {i + 1}
                </span>
                <Controller
                  control={control}
                  name={`exercises.${i}.exerciseId`}
                  render={({ field: f }) => {
                    const selecionado = exercises.find((e) => e.id === f.value);
                    return (
                      <div className="flex flex-1 items-center gap-1.5">
                        <Select value={f.value} onValueChange={f.onChange}>
                          <SelectTrigger className="flex-1">
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
                        {selecionado ? (
                          <VideoExercicio nome={selecionado.name} variant="icon" />
                        ) : null}
                      </div>
                    );
                  }}
                />
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Remover exercício"
                  onClick={() => remove(i)}
                  disabled={fields.length === 1}
                >
                  <TrashIcon className="size-4" />
                </Button>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 pl-8 sm:grid-cols-4">
                <div>
                  <FieldLabel className="text-xs">Séries</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    placeholder="3"
                    {...register(`exercises.${i}.sets`, numero)}
                  />
                </div>
                <div>
                  <FieldLabel className="text-xs">Reps</FieldLabel>
                  <Input
                    type="number"
                    min={0}
                    placeholder="10"
                    {...register(`exercises.${i}.reps`, numero)}
                  />
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
                    placeholder="1–5"
                    {...register(`exercises.${i}.resistanceLevel`, numero)}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full border-dashed"
          onClick={() => append(linhaVazia())}
        >
          <PlusIcon className="size-4" /> Adicionar exercício
        </Button>
      </Secao>

      {/* Observações */}
      <Secao
        icon={NotePencilIcon}
        titulo="Observações"
        descricao="Como a aluna respondeu, ajustes feitos, o que observar na próxima."
      >
        <Field>
          <Textarea
            id="notes"
            rows={3}
            placeholder="Ex.: boa tolerância ao core; evoluir carga na próxima aula."
            {...register("notes")}
          />
        </Field>
      </Secao>

      <div className="sticky bottom-0 -mx-1 flex justify-end border-t bg-background/80 px-1 py-3 backdrop-blur-sm">
        <Button type="submit" size="lg" disabled={isSubmitting}>
          <FloppyDiskIcon className="size-4" weight="fill" />
          {isSubmitting ? "Salvando…" : "Salvar aula"}
        </Button>
      </div>
    </form>
  );
}
