"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { type OnboardingInput, onboardingSchema } from "@/lib/validators/onboarding";
import { completarOnboarding } from "@/server/actions/onboarding";

type Props = {
  defaultFullName: string;
  defaultStudioName: string;
};

export function OnboardingForm({ defaultFullName, defaultStudioName }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingInput>({
    resolver: zodResolver(onboardingSchema),
    defaultValues: {
      fullName: defaultFullName,
      studioName: defaultStudioName === "Meu consultório" ? "" : defaultStudioName,
      crefito: "",
      phone: "",
    },
  });

  async function onSubmit(values: OnboardingInput) {
    const res = await completarOnboarding(values);
    // Em caso de sucesso a action redireciona; só tratamos o erro aqui.
    if (res?.ok === false) toast.error(res.erro);
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
          <Input id="studioName" placeholder="Opcional" {...register("studioName")} />
          <FieldDescription>Aparece no topo do app. Você pode mudar depois.</FieldDescription>
          <FieldError errors={[errors.studioName]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="crefito">CREFITO</FieldLabel>
          <Input id="crefito" placeholder="Opcional" {...register("crefito")} />
          <FieldError errors={[errors.crefito]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="phone">Telefone</FieldLabel>
          <Input
            id="phone"
            type="tel"
            autoComplete="tel"
            placeholder="Opcional"
            {...register("phone")}
          />
          <FieldError errors={[errors.phone]} />
        </Field>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando…" : "Começar a usar"}
        </Button>
      </FieldGroup>
    </form>
  );
}
