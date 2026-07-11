"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { DIAS_SEMANA } from "@/lib/labels";
import {
  atualizarTurmaSchema,
  type CriarTurmaInput,
  criarTurmaSchema,
} from "@/lib/validators/turma";
import { atualizarTurma, criarTurma } from "@/server/actions/turmas";
import type { Turma } from "@/server/turmas";

function defaults(turma?: Turma): CriarTurmaInput {
  return {
    name: turma?.name ?? "",
    notes: turma?.notes ?? "",
    defaultDurationMin: turma?.default_duration_min ?? 50,
    maxStudents: turma?.max_students ?? 6,
    weekday: turma?.weekday ?? null,
    startTime: turma?.start_time ?? null,
    status: (turma?.status as CriarTurmaInput["status"]) ?? "active",
  };
}

/** `Select` trabalha com strings; converter weekday (0–6 | null). */
const NENHUM_DIA = "none";

export function TurmaForm({ turma }: { turma?: Turma }) {
  const router = useRouter();
  const editando = Boolean(turma);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CriarTurmaInput>({
    resolver: zodResolver(editando ? atualizarTurmaSchema : criarTurmaSchema),
    defaultValues: defaults(turma),
  });

  async function onSubmit(values: CriarTurmaInput) {
    if (turma) {
      const res = await atualizarTurma(turma.id, values);
      if (res.ok) toast.success("Turma atualizada.");
      else toast.error(res.erro);
      return;
    }
    const res = await criarTurma(values);
    if (res.ok) {
      toast.success("Turma criada.");
      router.push(`/turmas/${res.data.id}`);
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Nome da turma</FieldLabel>
          <Input id="name" placeholder="Ex.: Turma 19h Segunda" {...register("name")} />
          <FieldError errors={[errors.name]} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="weekday">Dia habitual</FieldLabel>
            <Controller
              control={control}
              name="weekday"
              render={({ field }) => (
                <Select
                  value={field.value == null ? NENHUM_DIA : String(field.value)}
                  onValueChange={(v) => field.onChange(v === NENHUM_DIA ? null : Number(v))}
                >
                  <SelectTrigger id="weekday">
                    <SelectValue placeholder="Sem dia fixo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NENHUM_DIA}>Sem dia fixo</SelectItem>
                    {DIAS_SEMANA.map((d, i) => (
                      <SelectItem key={d} value={String(i)}>
                        {d}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <FieldError errors={[errors.weekday]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="startTime">Horário habitual</FieldLabel>
            <Controller
              control={control}
              name="startTime"
              render={({ field }) => (
                <Input
                  id="startTime"
                  type="time"
                  value={field.value ?? ""}
                  onChange={(e) => field.onChange(e.target.value || null)}
                />
              )}
            />
            <FieldError errors={[errors.startTime]} />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="maxStudents">Máximo de alunas</FieldLabel>
            <Input
              id="maxStudents"
              type="number"
              min={1}
              max={20}
              {...register("maxStudents", { valueAsNumber: true })}
            />
            <FieldError errors={[errors.maxStudents]} />
          </Field>

          <Field>
            <FieldLabel htmlFor="defaultDurationMin">Duração (min)</FieldLabel>
            <Input
              id="defaultDurationMin"
              type="number"
              min={10}
              max={180}
              {...register("defaultDurationMin", { valueAsNumber: true })}
            />
            <FieldError errors={[errors.defaultDurationMin]} />
          </Field>
        </div>

        <Field>
          <FieldLabel htmlFor="notes">Observações</FieldLabel>
          <Textarea id="notes" rows={3} {...register("notes")} />
          <FieldError errors={[errors.notes]} />
        </Field>
      </FieldGroup>

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando…" : editando ? "Salvar alterações" : "Criar turma"}
        </Button>
      </div>
    </form>
  );
}
