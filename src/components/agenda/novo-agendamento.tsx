"use client";

import { PlusIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
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
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { criarAgendamento } from "@/server/actions/agenda";

type AlunoOpcao = { id: string; full_name: string };

export function NovoAgendamento({
  alunos,
  defaultDate,
  defaultStudentId,
  trigger,
}: {
  alunos: AlunoOpcao[];
  defaultDate?: string;
  defaultStudentId?: string;
  trigger?: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [studentId, setStudentId] = useState(defaultStudentId ?? "");
  const [data, setData] = useState(defaultDate ?? "");
  const [hora, setHora] = useState("08:00");
  const [duracao, setDuracao] = useState("50");
  const [repetir, setRepetir] = useState("0");
  const [notes, setNotes] = useState("");

  function limpar() {
    setStudentId(defaultStudentId ?? "");
    setData(defaultDate ?? "");
    setHora("08:00");
    setDuracao("50");
    setRepetir("0");
    setNotes("");
  }

  async function salvar() {
    if (!studentId) return toast.error("Escolha o aluno.");
    if (!data) return toast.error("Escolha a data.");
    setSalvando(true);
    try {
      const res = await criarAgendamento({
        studentId,
        data,
        hora,
        duracaoMin: Number(duracao),
        repetirSemanas: Number(repetir),
        notes,
      });
      if (!res.ok) return void toast.error(res.erro);
      toast.success(
        res.data.criados > 1 ? `${res.data.criados} aulas agendadas.` : "Aula agendada.",
      );
      setOpen(false);
      limpar();
      router.refresh();
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setData(defaultDate ?? "");
        else limpar();
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm">
            <PlusIcon className="size-4" /> Nova aula
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agendar aula</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="ag-aluno">Aluno</FieldLabel>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger id="ag-aluno">
                <SelectValue placeholder="Escolha o aluno" />
              </SelectTrigger>
              <SelectContent>
                {alunos.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="ag-data">Data</FieldLabel>
              <Input
                id="ag-data"
                type="date"
                value={data}
                onChange={(e) => setData(e.target.value)}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="ag-hora">Horário</FieldLabel>
              <Input
                id="ag-hora"
                type="time"
                value={hora}
                onChange={(e) => setHora(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field>
              <FieldLabel htmlFor="ag-dur">Duração</FieldLabel>
              <Select value={duracao} onValueChange={setDuracao}>
                <SelectTrigger id="ag-dur">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 min</SelectItem>
                  <SelectItem value="45">45 min</SelectItem>
                  <SelectItem value="50">50 min</SelectItem>
                  <SelectItem value="60">1 hora</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <FieldLabel htmlFor="ag-rep">Repetir</FieldLabel>
              <Select value={repetir} onValueChange={setRepetir}>
                <SelectTrigger id="ag-rep">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">Não repetir</SelectItem>
                  <SelectItem value="3">Por 4 semanas</SelectItem>
                  <SelectItem value="7">Por 8 semanas</SelectItem>
                  <SelectItem value="11">Por 12 semanas</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field>
            <FieldLabel htmlFor="ag-notes">Observação (opcional)</FieldLabel>
            <Textarea
              id="ag-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex.: foco em coluna, levar faixa…"
            />
          </Field>
        </div>
        <DialogFooter className="mt-1">
          <Button onClick={salvar} disabled={salvando || !studentId || !data}>
            {salvando ? "Agendando…" : "Agendar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
