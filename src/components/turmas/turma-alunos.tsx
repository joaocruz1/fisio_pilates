"use client";

import { MinusCircleIcon, PlusIcon, UserIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { adicionarAlunoTurma, removerAlunoTurma } from "@/server/actions/turmas";
import type { AlunoDaTurma } from "@/server/turmas";

type Opcao = { id: string; full_name: string };

function condicoesTexto(c: AlunoDaTurma["conditions"]): string {
  const ativas = c.filter((x) => x.status === "active");
  if (ativas.length === 0) return "Sem condições ativas";
  return ativas.map((x) => x.name).join(", ");
}

export function TurmaAlunos({
  classGroupId,
  alunosNaTurma,
  disponiveis,
}: {
  classGroupId: string;
  alunosNaTurma: AlunoDaTurma[];
  disponiveis: Opcao[];
}) {
  const router = useRouter();
  const [selecionado, setSelecionado] = useState<string>("");
  const [ocupado, setOcupado] = useState(false);

  async function adicionar() {
    if (!selecionado) return;
    setOcupado(true);
    try {
      const res = await adicionarAlunoTurma(classGroupId, { studentId: selecionado });
      if (res.ok) {
        toast.success("Aluna adicionada à turma.");
        setSelecionado("");
        router.refresh();
      } else {
        toast.error(res.erro);
      }
    } finally {
      setOcupado(false);
    }
  }

  async function remover(studentId: string, nome: string) {
    setOcupado(true);
    try {
      const res = await removerAlunoTurma(classGroupId, studentId);
      if (res.ok) {
        toast.success(`${nome} removida da turma.`);
        router.refresh();
      } else {
        toast.error(res.erro);
      }
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <Select value={selecionado} onValueChange={setSelecionado}>
          <SelectTrigger className="sm:flex-1">
            <SelectValue
              placeholder={disponiveis.length ? "Selecione uma aluna" : "Nenhuma aluna disponível"}
            />
          </SelectTrigger>
          <SelectContent>
            {disponiveis.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.full_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          type="button"
          onClick={adicionar}
          disabled={ocupado || !selecionado}
          className="shrink-0"
        >
          <PlusIcon className="size-4" /> Adicionar
        </Button>
      </div>

      {alunosNaTurma.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          Esta turma ainda não tem alunas. Adicione alunas para gerar o plano coletivo.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {alunosNaTurma.map((a) => (
            <li
              key={a.id}
              className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserIcon className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{a.full_name}</p>
                <p className="truncate text-xs text-muted-foreground">
                  {condicoesTexto(a.conditions)}
                </p>
              </div>
              <Button
                type="button"
                size="icon"
                variant="ghost"
                className="size-8 shrink-0 text-muted-foreground hover:text-destructive"
                aria-label={`Remover ${a.full_name}`}
                disabled={ocupado}
                onClick={() => remover(a.id, a.full_name)}
              >
                <MinusCircleIcon className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
