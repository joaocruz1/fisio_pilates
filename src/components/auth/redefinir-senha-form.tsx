"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { mensagemErroAuth } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";
import { type RedefinirSenhaInput, redefinirSenhaSchema } from "@/lib/validators/auth";

export function RedefinirSenhaForm() {
  const router = useRouter();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RedefinirSenhaInput>({ resolver: zodResolver(redefinirSenhaSchema) });

  async function onSubmit(values: RedefinirSenhaInput) {
    const supabase = createClient();
    const { error } = await supabase.auth.updateUser({ password: values.senha });
    if (error) {
      toast.error(mensagemErroAuth(error));
      return;
    }
    toast.success("Senha alterada com sucesso.");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="senha">Nova senha</FieldLabel>
          <Input id="senha" type="password" autoComplete="new-password" {...register("senha")} />
          <FieldError errors={[errors.senha]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="confirmarSenha">Confirmar nova senha</FieldLabel>
          <Input
            id="confirmarSenha"
            type="password"
            autoComplete="new-password"
            {...register("confirmarSenha")}
          />
          <FieldError errors={[errors.confirmarSenha]} />
        </Field>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando…" : "Salvar nova senha"}
        </Button>
      </FieldGroup>
    </form>
  );
}
