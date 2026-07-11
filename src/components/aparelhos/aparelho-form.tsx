"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { TrashIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
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
import { APARELHOS, rotuloAparelho, rotuloStatusAparelho, STATUS_APARELHO } from "@/lib/labels";
import {
  atualizarAparelhoSchema,
  type CriarAparelhoInput,
  criarAparelhoSchema,
} from "@/lib/validators/aparelho";
import { atualizarAparelho, criarAparelho, excluirAparelho } from "@/server/actions/aparelhos";
import type { Aparelho } from "@/server/aparelhos";

function defaults(aparelho?: Aparelho): CriarAparelhoInput {
  return {
    label: aparelho?.label ?? "",
    apparatus: (aparelho?.apparatus as CriarAparelhoInput["apparatus"]) ?? "reformer",
    status: (aparelho?.status as CriarAparelhoInput["status"]) ?? "active",
    notes: aparelho?.notes ?? "",
  };
}

export function AparelhoForm({ aparelho }: { aparelho?: Aparelho }) {
  const router = useRouter();
  const editando = Boolean(aparelho);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CriarAparelhoInput>({
    resolver: zodResolver(editando ? atualizarAparelhoSchema : criarAparelhoSchema),
    defaultValues: defaults(aparelho),
  });

  async function onSubmit(values: CriarAparelhoInput) {
    if (aparelho) {
      const res = await atualizarAparelho(aparelho.id, values);
      if (res.ok) toast.success("Aparelho atualizado.");
      else toast.error(res.erro);
      return;
    }
    const res = await criarAparelho(values);
    if (res.ok) {
      toast.success("Aparelho cadastrado.");
      router.push(`/aparelhos/${res.data.id}`);
    } else {
      toast.error(res.erro);
    }
  }

  async function excluir() {
    if (!aparelho) return;
    const res = await excluirAparelho(aparelho.id);
    if (res.ok) {
      toast.success("Aparelho excluído.");
      router.push("/aparelhos");
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="label">Rótulo</FieldLabel>
          <Input id="label" placeholder="Ex.: Reformer 1" {...register("label")} />
          <FieldError errors={[errors.label]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="apparatus">Tipo de aparelho</FieldLabel>
          <Controller
            control={control}
            name="apparatus"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="apparatus">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {APARELHOS.map((a) => (
                    <SelectItem key={a} value={a}>
                      {rotuloAparelho[a]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.apparatus]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="status">Status</FieldLabel>
          <Controller
            control={control}
            name="status"
            render={({ field }) => (
              <Select value={field.value ?? "active"} onValueChange={field.onChange}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_APARELHO.map((s) => (
                    <SelectItem key={s} value={s}>
                      {rotuloStatusAparelho[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <p className="text-sm text-muted-foreground">
            Apenas aparelhos <strong>Ativos</strong> viram estações na rotação da aula coletiva.
          </p>
          <FieldError errors={[errors.status]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="notes">Observações</FieldLabel>
          <Textarea id="notes" rows={3} {...register("notes")} />
          <FieldError errors={[errors.notes]} />
        </Field>
      </FieldGroup>

      <div className="flex items-center justify-between gap-3">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando…" : editando ? "Salvar alterações" : "Cadastrar aparelho"}
        </Button>
        {editando ? (
          <ConfirmDialog
            trigger={
              <Button type="button" variant="destructive" size="sm">
                <TrashIcon className="size-4" /> Excluir
              </Button>
            }
            title="Excluir aparelho"
            description="Tem certeza? Esta ação remove o aparelho do inventário do estúdio."
            confirmLabel="Excluir"
            destructive
            onConfirm={excluir}
          />
        ) : null}
      </div>
    </form>
  );
}
