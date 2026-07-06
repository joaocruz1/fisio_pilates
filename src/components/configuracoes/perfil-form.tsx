"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type PerfilInput, perfilSchema } from "@/lib/validators/onboarding";
import { atualizarPerfil } from "@/server/actions/onboarding";

type Props = {
  defaultFullName: string;
  defaultStudioName: string;
  defaultCrefito: string;
  defaultPhone: string;
};

export function PerfilForm({
  defaultFullName,
  defaultStudioName,
  defaultCrefito,
  defaultPhone,
}: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<PerfilInput>({
    resolver: zodResolver(perfilSchema),
    defaultValues: {
      fullName: defaultFullName,
      studioName: defaultStudioName,
      crefito: defaultCrefito,
      phone: defaultPhone,
    },
  });

  async function onSubmit(values: PerfilInput) {
    const res = await atualizarPerfil(values);
    if (res.ok) toast.success("Perfil atualizado.");
    else toast.error(res.erro);
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="fullName">Nome completo</FieldLabel>
          <Input id="fullName" autoComplete="name" {...register("fullName")} />
          <FieldError errors={[errors.fullName]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="studioName">Nome do estúdio</FieldLabel>
          <Input id="studioName" {...register("studioName")} />
          <FieldError errors={[errors.studioName]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="crefito">CREFITO</FieldLabel>
          <Input id="crefito" {...register("crefito")} />
          <FieldError errors={[errors.crefito]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="phone">Telefone</FieldLabel>
          <Input id="phone" type="tel" autoComplete="tel" {...register("phone")} />
          <FieldError errors={[errors.phone]} />
        </Field>
        <div>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Salvar perfil"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
