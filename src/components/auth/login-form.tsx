"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { mensagemErroAuth } from "@/lib/auth-errors";
import { createClient } from "@/lib/supabase/client";
import { type LoginInput, loginSchema } from "@/lib/validators/auth";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  async function onSubmit(values: LoginInput) {
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: values.email,
      password: values.senha,
    });
    if (error) {
      toast.error(mensagemErroAuth(error));
      return;
    }
    // B12: se a conta é admin, vai pro painel admin; senão, fluxo normal.
    const { data: adminRow } = await supabase
      .from("admin_users")
      .select("id")
      .eq("id", (await supabase.auth.getUser()).data.user?.id ?? "")
      .maybeSingle();
    const destino = adminRow ? "/admin" : (params.get("redirect") ?? "/dashboard");
    router.push(destino);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="email">E-mail</FieldLabel>
          <Input id="email" type="email" autoComplete="email" {...register("email")} />
          <FieldError errors={[errors.email]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="senha">Senha</FieldLabel>
          <Input
            id="senha"
            type="password"
            autoComplete="current-password"
            {...register("senha")}
          />
          <FieldError errors={[errors.senha]} />
        </Field>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Entrando…" : "Entrar"}
        </Button>
      </FieldGroup>

      <div className="mt-6 flex flex-col gap-2 text-center text-sm text-muted-foreground">
        <Link href="/recuperar-senha" className="hover:text-foreground hover:underline">
          Esqueci minha senha
        </Link>
        <span>
          Não tem conta?{" "}
          <Link href="/cadastro" className="font-medium text-foreground hover:underline">
            Criar conta
          </Link>
        </span>
      </div>
    </form>
  );
}
