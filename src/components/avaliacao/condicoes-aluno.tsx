"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PencilSimpleIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import type { z } from "zod";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import {
  rotuloSeveridade,
  rotuloStatusCondicao,
  SEVERIDADES,
  STATUS_CONDICAO,
  type StatusCondicao,
} from "@/lib/labels";
import { formatarData } from "@/lib/utils";
import { type CondicaoInput, condicaoSchema } from "@/lib/validators/condicao";
import { atualizarCondicao, criarCondicao, excluirCondicao } from "@/server/actions/condicoes";
import type { Condition } from "@/server/conditions";

function CondicaoDialog({
  studentId,
  condicao,
  trigger,
}: {
  studentId: string;
  condicao?: Condition;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<z.input<typeof condicaoSchema>, unknown, CondicaoInput>({
    resolver: zodResolver(condicaoSchema),
    defaultValues: {
      name: condicao?.name ?? "",
      cidCode: condicao?.cid_code ?? "",
      status: (condicao?.status as StatusCondicao) ?? "active",
      severity: (condicao?.severity as CondicaoInput["severity"]) ?? undefined,
      diagnosedAt: condicao?.diagnosed_at ?? "",
      notes: condicao?.notes ?? "",
    },
  });

  async function onSubmit(values: CondicaoInput) {
    const res = condicao
      ? await atualizarCondicao(condicao.id, studentId, values)
      : await criarCondicao(studentId, values);
    if (res.ok) {
      toast.success(condicao ? "Condição atualizada." : "Condição adicionada.");
      setOpen(false);
      if (!condicao) reset();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{condicao ? "Editar condição" : "Nova condição"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="cond-name">Nome</FieldLabel>
              <Input id="cond-name" placeholder="Ex.: Hérnia discal L4-L5" {...register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="cond-cid">CID-10</FieldLabel>
                <Input id="cond-cid" placeholder="Opcional" {...register("cidCode")} />
                <FieldError errors={[errors.cidCode]} />
              </Field>
              <Field>
                <FieldLabel htmlFor="cond-date">Diagnóstico em</FieldLabel>
                <Input id="cond-date" type="date" {...register("diagnosedAt")} />
                <FieldError errors={[errors.diagnosedAt]} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="cond-status">Status</FieldLabel>
                <Select
                  value={watch("status")}
                  onValueChange={(v) => setValue("status", v as StatusCondicao)}
                >
                  <SelectTrigger id="cond-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_CONDICAO.map((s) => (
                      <SelectItem key={s} value={s}>
                        {rotuloStatusCondicao[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="cond-sev">Gravidade</FieldLabel>
                <Select
                  value={watch("severity") ?? ""}
                  onValueChange={(v) => setValue("severity", v as CondicaoInput["severity"])}
                >
                  <SelectTrigger id="cond-sev">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERIDADES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {rotuloSeveridade[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="cond-notes">Observações</FieldLabel>
              <Textarea id="cond-notes" rows={2} {...register("notes")} />
              <FieldError errors={[errors.notes]} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-4">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Salvando…" : "Salvar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CondicoesAluno({
  studentId,
  condicoes,
}: {
  studentId: string;
  condicoes: Condition[];
}) {
  async function excluir(id: string) {
    const res = await excluirCondicao(id, studentId);
    if (res.ok) toast.success("Condição removida.");
    else toast.error(res.erro);
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Condições e patologias</h2>
        <CondicaoDialog
          studentId={studentId}
          trigger={
            <Button size="sm" variant="outline">
              <PlusIcon className="size-4" /> Adicionar
            </Button>
          }
        />
      </div>

      {condicoes.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma condição registrada.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {condicoes.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-3 rounded-lg border p-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{c.name}</span>
                  {c.cid_code ? (
                    <span className="text-xs text-muted-foreground">{c.cid_code}</span>
                  ) : null}
                  <Badge variant={c.status === "active" ? "default" : "secondary"}>
                    {rotuloStatusCondicao[c.status as StatusCondicao] ?? c.status}
                  </Badge>
                </div>
                {c.notes ? <p className="mt-1 text-sm text-muted-foreground">{c.notes}</p> : null}
                {c.diagnosed_at ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    Diagnóstico: {formatarData(c.diagnosed_at)}
                  </p>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-1">
                <CondicaoDialog
                  studentId={studentId}
                  condicao={c}
                  trigger={
                    <Button size="icon" variant="ghost" aria-label="Editar condição">
                      <PencilSimpleIcon className="size-4" />
                    </Button>
                  }
                />
                <Button
                  size="icon"
                  variant="ghost"
                  aria-label="Excluir condição"
                  onClick={() => excluir(c.id)}
                >
                  <TrashIcon className="size-4" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
