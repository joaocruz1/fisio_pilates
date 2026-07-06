"use client";

import {
  ArchiveIcon,
  ArrowCounterClockwiseIcon,
  DotsThreeVerticalIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { alterarStatusAluno, excluirAluno } from "@/server/actions/alunos";

export function AcoesAluno({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  const arquivada = status === "archived";

  async function toggleArquivo() {
    const res = await alterarStatusAluno(id, arquivada ? "active" : "archived");
    if (res.ok) {
      toast.success(arquivada ? "Aluno reativado." : "Aluno arquivado.");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  async function confirmarExclusao() {
    setExcluindo(true);
    const res = await excluirAluno(id);
    setExcluindo(false);
    if (res.ok) {
      setConfirmOpen(false);
      toast.success("Aluno excluído.");
      router.push("/alunos");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" aria-label="Ações do aluno">
            <DotsThreeVerticalIcon className="size-5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          <DropdownMenuItem onClick={toggleArquivo}>
            {arquivada ? (
              <>
                <ArrowCounterClockwiseIcon className="size-4" /> Reativar
              </>
            ) : (
              <>
                <ArchiveIcon className="size-4" /> Arquivar
              </>
            )}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant="destructive"
            onSelect={(e) => {
              e.preventDefault();
              setConfirmOpen(true);
            }}
          >
            <TrashIcon className="size-4" /> Excluir
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir este aluno?</AlertDialogTitle>
            <AlertDialogDescription>
              Os dados do aluno (avaliações, sessões e documentos) serão removidos. Esta ação faz
              parte do fluxo de exclusão da LGPD e não pode ser desfeita pela interface.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={excluindo}>Cancelar</AlertDialogCancel>
            <Button variant="destructive" onClick={confirmarExclusao} disabled={excluindo}>
              {excluindo ? "Excluindo…" : "Excluir"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
