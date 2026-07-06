"use client";

import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { excluirConta } from "@/server/actions/lgpd";

export function ExcluirConta() {
  async function excluir() {
    const res = await excluirConta();
    // Em caso de sucesso a action redireciona; só tratamos erro aqui.
    if (res?.ok === false) toast.error(res.erro);
  }

  return (
    <ConfirmDialog
      title="Excluir sua conta?"
      description="Todos os seus dados e alunos serão apagados permanentemente. Esta ação não pode ser desfeita."
      confirmLabel="Excluir minha conta"
      destructive
      onConfirm={excluir}
      trigger={
        <Button variant="destructive" size="sm">
          Excluir conta
        </Button>
      }
    />
  );
}
