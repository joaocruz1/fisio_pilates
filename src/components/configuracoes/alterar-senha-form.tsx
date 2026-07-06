"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { mensagemErroAuth } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";
import { type RedefinirSenhaInput, redefinirSenhaSchema } from "@/lib/validators/auth";

export function AlterarSenhaForm() {
  const {
    register,
    handleSubmit,
    reset,
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
    reset();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="nova-senha">Nova senha</FieldLabel>
          <Input
            id="nova-senha"
            type="password"
            autoComplete="new-password"
            {...register("senha")}
          />
          <FieldError errors={[errors.senha]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="confirmar-senha">Confirmar nova senha</FieldLabel>
          <Input
            id="confirmar-senha"
            type="password"
            autoComplete="new-password"
            {...register("confirmarSenha")}
          />
          <FieldError errors={[errors.confirmarSenha]} />
        </Field>
        <div>
          <Button type="submit" variant="outline" disabled={isSubmitting}>
            {isSubmitting ? "Salvando…" : "Alterar senha"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
