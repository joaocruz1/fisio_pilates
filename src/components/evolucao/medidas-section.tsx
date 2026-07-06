"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatarData } from "@/lib/utils";
import { type MedidaInput, medidaSchema } from "@/lib/validators/medida";
import { excluirMedida, registrarMedida } from "@/server/actions/medidas";
import type { Measurement } from "@/server/measurements";

const hoje = () => new Date().toISOString().slice(0, 10);
const numero = { setValueAs: (v: string) => (v === "" || v == null ? undefined : Number(v)) };

function circ(m: Measurement, key: string): number | null {
  const c = (m.circumferences ?? {}) as Record<string, number>;
  return typeof c[key] === "number" ? c[key] : null;
}

function RegistrarMedidaDialog({ studentId }: { studentId: string }) {
  const [open, setOpen] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<MedidaInput>({
    resolver: zodResolver(medidaSchema),
    defaultValues: { measuredAt: hoje() },
  });

  async function onSubmit(values: MedidaInput) {
    const res = await registrarMedida(studentId, values);
    if (res.ok) {
      toast.success("Medida registrada.");
      setOpen(false);
      reset({ measuredAt: hoje() });
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <PlusIcon className="size-4" /> Registrar medida
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Registrar medida</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="measuredAt">Data</FieldLabel>
              <Input id="measuredAt" type="date" {...register("measuredAt")} />
              <FieldError errors={[errors.measuredAt]} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="weightKg">Peso (kg)</FieldLabel>
                <Input id="weightKg" type="number" step="0.1" {...register("weightKg", numero)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="heightCm">Altura (cm)</FieldLabel>
                <Input id="heightCm" type="number" step="0.1" {...register("heightCm", numero)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="waistCm">Cintura (cm)</FieldLabel>
                <Input id="waistCm" type="number" step="0.1" {...register("waistCm", numero)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="hipCm">Quadril (cm)</FieldLabel>
                <Input id="hipCm" type="number" step="0.1" {...register("hipCm", numero)} />
              </Field>
              <Field>
                <FieldLabel htmlFor="rightThighCm">Coxa D (cm)</FieldLabel>
                <Input
                  id="rightThighCm"
                  type="number"
                  step="0.1"
                  {...register("rightThighCm", numero)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="sitAndReachCm">Sentar-alcançar (cm)</FieldLabel>
                <Input
                  id="sitAndReachCm"
                  type="number"
                  step="0.1"
                  {...register("sitAndReachCm", numero)}
                />
              </Field>
            </div>
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

export function MedidasSection({
  studentId,
  medidas,
}: {
  studentId: string;
  medidas: Measurement[];
}) {
  async function excluir(id: string) {
    const res = await excluirMedida(id, studentId);
    if (res.ok) toast.success("Medida removida.");
    else toast.error(res.erro);
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Medidas corporais</h2>
        <RegistrarMedidaDialog studentId={studentId} />
      </div>

      {medidas.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nenhuma medida registrada.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Peso</TableHead>
                <TableHead>Cintura</TableHead>
                <TableHead>Quadril</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {medidas.map((m) => (
                <TableRow key={m.id}>
                  <TableCell>{formatarData(m.measured_at)}</TableCell>
                  <TableCell>{m.weight_kg != null ? `${m.weight_kg} kg` : "—"}</TableCell>
                  <TableCell>
                    {circ(m, "waist_cm") != null ? `${circ(m, "waist_cm")} cm` : "—"}
                  </TableCell>
                  <TableCell>
                    {circ(m, "hip_cm") != null ? `${circ(m, "hip_cm")} cm` : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      aria-label="Excluir medida"
                      onClick={() => excluir(m.id)}
                    >
                      <TrashIcon className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </section>
  );
}
