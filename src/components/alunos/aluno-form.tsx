"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { rotuloSexo, SEXOS } from "@/lib/labels";
import {
  atualizarAlunoSchema,
  type CriarAlunoInput,
  criarAlunoSchema,
} from "@/lib/validators/aluno";
import { atualizarAluno, criarAluno } from "@/server/actions/alunos";
import type { Student } from "@/server/students";

function defaults(aluno?: Student): CriarAlunoInput {
  return {
    fullName: aluno?.full_name ?? "",
    birthDate: aluno?.birth_date ?? "",
    sex: (aluno?.sex as CriarAlunoInput["sex"]) ?? undefined,
    cpf: aluno?.cpf ?? "",
    phone: aluno?.phone ?? "",
    email: aluno?.email ?? "",
    occupation: aluno?.occupation ?? "",
    emergencyContactName: aluno?.emergency_contact_name ?? "",
    emergencyContactPhone: aluno?.emergency_contact_phone ?? "",
    generalNotes: aluno?.general_notes ?? "",
    consent: false,
  };
}

export function AlunoForm({ aluno }: { aluno?: Student }) {
  const router = useRouter();
  const editando = Boolean(aluno);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CriarAlunoInput>({
    resolver: zodResolver(editando ? atualizarAlunoSchema : criarAlunoSchema),
    defaultValues: defaults(aluno),
  });

  async function onSubmit(values: CriarAlunoInput) {
    if (aluno) {
      const res = await atualizarAluno(aluno.id, values);
      if (res.ok) toast.success("Aluno atualizado.");
      else toast.error(res.erro);
      return;
    }
    const res = await criarAluno(values);
    if (res.ok) {
      toast.success("Aluno cadastrado.");
      router.push(`/alunos/${res.data.id}`);
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-6">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="fullName">Nome completo</FieldLabel>
          <Input id="fullName" autoComplete="name" {...register("fullName")} />
          <FieldError errors={[errors.fullName]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="birthDate">Data de nascimento</FieldLabel>
          <Input id="birthDate" type="date" {...register("birthDate")} />
          <FieldError errors={[errors.birthDate]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="sex">Sexo</FieldLabel>
          <Controller
            control={control}
            name="sex"
            render={({ field }) => (
              <Select value={field.value ?? ""} onValueChange={field.onChange}>
                <SelectTrigger id="sex">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {SEXOS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {rotuloSexo[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          <FieldError errors={[errors.sex]} />
        </Field>
        <Field>
          <FieldLabel htmlFor="phone">Telefone</FieldLabel>
          <Input id="phone" type="tel" autoComplete="tel" {...register("phone")} />
          <FieldError errors={[errors.phone]} />
        </Field>
      </FieldGroup>

      <details className="rounded-lg border px-4 py-3">
        <summary className="cursor-pointer text-sm font-medium">Mais informações</summary>
        <FieldGroup className="mt-4">
          <Field>
            <FieldLabel htmlFor="email">E-mail</FieldLabel>
            <Input id="email" type="email" autoComplete="email" {...register("email")} />
            <FieldError errors={[errors.email]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="cpf">CPF</FieldLabel>
            <Input id="cpf" inputMode="numeric" {...register("cpf")} />
            <FieldError errors={[errors.cpf]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="occupation">Profissão</FieldLabel>
            <Input id="occupation" {...register("occupation")} />
            <FieldError errors={[errors.occupation]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="emergencyContactName">Contato de emergência</FieldLabel>
            <Input id="emergencyContactName" {...register("emergencyContactName")} />
            <FieldError errors={[errors.emergencyContactName]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="emergencyContactPhone">Telefone de emergência</FieldLabel>
            <Input id="emergencyContactPhone" type="tel" {...register("emergencyContactPhone")} />
            <FieldError errors={[errors.emergencyContactPhone]} />
          </Field>
          <Field>
            <FieldLabel htmlFor="generalNotes">Observações</FieldLabel>
            <Textarea id="generalNotes" rows={3} {...register("generalNotes")} />
            <FieldError errors={[errors.generalNotes]} />
          </Field>
        </FieldGroup>
      </details>

      {!editando ? (
        <FieldSet className="rounded-lg border bg-muted/30 p-4">
          <FieldLegend className="text-sm">Dados de saúde (LGPD)</FieldLegend>
          <FieldDescription>
            Este cadastro trata dados de saúde. Registre o consentimento do aluno quando ele
            autorizar o tratamento dos dados.
          </FieldDescription>
          <Field orientation="horizontal" className="mt-2">
            <Controller
              control={control}
              name="consent"
              render={({ field }) => (
                <Checkbox
                  id="consent"
                  checked={field.value ?? false}
                  onCheckedChange={(v) => field.onChange(v === true)}
                />
              )}
            />
            <FieldLabel htmlFor="consent" className="text-sm font-normal">
              O aluno consentiu com o tratamento dos seus dados.
            </FieldLabel>
          </Field>
        </FieldSet>
      ) : null}

      <div>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Salvando…" : editando ? "Salvar alterações" : "Cadastrar aluno"}
        </Button>
      </div>
    </form>
  );
}
