"use client";

import { TrashIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { excluirKbDocumento } from "@/server/actions/conhecimento";
import type { KbDocument } from "@/server/knowledge";

function statusBadge(doc: KbDocument) {
  if (doc.status === "ready") return <Badge variant="default">Pronto</Badge>;
  if (doc.status === "failed") return <Badge variant="destructive">Erro</Badge>;
  if (doc.status === "processing") {
    const total = doc.total_pages ?? 0;
    const label = total ? `Processando ${doc.processed_pages}/${total} págs` : "Processando";
    return <Badge variant="secondary">{label}</Badge>;
  }
  return <Badge variant="secondary">Na fila</Badge>;
}

export function ListaMateriais({ documentos }: { documentos: KbDocument[] }) {
  const router = useRouter();

  async function excluir(id: string) {
    const res = await excluirKbDocumento(id);
    if (res.ok) {
      toast.success("Material removido.");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  if (documentos.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum material na base ainda.</p>;
  }

  return (
    <ul className="flex flex-col gap-2">
      {documentos.map((d) => (
        <li key={d.id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="truncate font-medium">{d.title}</span>
              {d.scope === "global" ? <Badge variant="outline">Base do sistema</Badge> : null}
              {statusBadge(d)}
            </div>
            {d.chunk_count > 0 ? (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {d.chunk_count} trechos indexados
              </p>
            ) : null}
            {d.status === "failed" && d.error_message ? (
              <p className="mt-0.5 text-xs text-destructive">{d.error_message}</p>
            ) : null}
          </div>
          {d.scope === "tenant" ? (
            <ConfirmDialog
              title="Excluir este material?"
              description="O arquivo e os trechos indexados serão removidos da base."
              confirmLabel="Excluir"
              destructive
              onConfirm={() => excluir(d.id)}
              trigger={
                <Button size="icon" variant="ghost" aria-label="Excluir material">
                  <TrashIcon className="size-4" />
                </Button>
              }
            />
          ) : null}
        </li>
      ))}
    </ul>
  );
}
