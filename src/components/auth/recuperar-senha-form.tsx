"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { EnvelopeSimpleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { mensagemErroAuth } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";
import { type RecuperarSenhaInput, recuperarSenhaSchema } from "@/lib/validators/auth";

export function RecuperarSenhaForm() {
  const [enviado, setEnviado] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RecuperarSenhaInput>({ resolver: zodResolver(recuperarSenhaSchema) });

  async function onSubmit(values: RecuperarSenhaInput) {
    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/redefinir-senha`,
    });
    // Não revelamos se o e-mail existe (evita enumeração de usuárias).
    if (error && error.code === "over_email_send_rate_limit") {
      toast.error(mensagemErroAuth(error));
      return;
    }
    setEnviado(true);
  }

  if (enviado) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <EnvelopeSimpleIcon className="size-10 text-primary" weight="duotone" />
        <h2 className="text-lg font-semibold">Verifique seu e-mail</h2>
        <p className="text-sm text-muted-foreground">
          Se houver uma conta com esse e-mail, enviamos um link para redefinir sua senha.
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
          <FieldLabel htmlFor="email">E-mail</FieldLabel>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          <FieldError errors={[errors.email]} />
        </Field>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Enviando…" : "Enviar link de redefinição"}
        </Button>
      </FieldGroup>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link href="/login" className="hover:text-foreground hover:underline">
          Voltar para o login
        </Link>
      </p>
    </form>
  );
}
