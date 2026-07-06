"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { mensagemErroAuth } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";
import { type CadastroInput, cadastroSchema } from "@/lib/validators/auth";

export function CadastroForm() {
  const [enviado, setEnviado] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CadastroInput>({
    resolver: zodResolver(cadastroSchema),
    defaultValues: { fullName: "", email: "", senha: "", aceiteLgpd: false },
  });

  async function onSubmit(values: CadastroInput) {
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.senha,
      options: {
        data: { full_name: values.fullName },
        emailRedirectTo: `${window.location.origin}/auth/confirm?next=/onboarding`,
      },
    });
    if (error) {
      toast.error(mensagemErroAuth(error));
      return;
    }
    setEnviado(values.email);
  }

  if (enviado) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <EnvelopeSimpleIcon className="size-10 text-primary" weight="duotone" />
        <h2 className="text-lg font-semibold">Confirme seu e-mail</h2>
        <p className="text-sm text-muted-foreground">
          Enviamos um link de confirmação para <strong>{enviado}</strong>. Abra o e-mail para ativar
          sua conta e começar.
        </p>
        <Link href="/login" className="mt-2 text-sm font-medium hover:underline">
          Voltar para o login
        </Link>
      </div>
    );
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
          <FieldLabel htmlFor="email">E-mail</FieldLabel>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="senha">Senha</FieldLabel>
          <Input id="senha" type="password" autoComplete="new-password" {...register("senha")} />
          <FieldError errors={[errors.senha]} />
        </Field>
        <Field orientation="horizontal">
          <Controller
            control={control}
            name="aceiteLgpd"
            render={({ field }) => (
              <Checkbox
                id="aceiteLgpd"
                checked={field.value}
                onCheckedChange={(v) => field.onChange(v === true)}
              />
            )}
          />
          <FieldLabel htmlFor="aceiteLgpd" className="text-sm font-normal">
            Li e aceito o tratamento dos meus dados conforme a Política de Privacidade.
          </FieldLabel>
        </Field>
        <FieldError errors={[errors.aceiteLgpd]} />
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Criando conta…" : "Criar conta"}
        </Button>
      </FieldGroup>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link href="/login" className="font-medium text-foreground hover:underline">
          Entrar
        </Link>
      </p>
    </form>
  );
}
