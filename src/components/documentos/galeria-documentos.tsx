"use client";

import { DownloadSimpleIcon, FileIcon, ImageIcon, TrashIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Button } from "@/components/ui/button";
import { DOC_KINDS, type DocKind, rotuloDocKind } from "@/lib/labels";
import { formatarData, formatarTamanho } from "@/lib/utils";
import { excluirDocumento, gerarUrlDownload } from "@/server/actions/documentos";
import type { Document } from "@/server/documents";

async function abrir(documentId: string) {
  const res = await gerarUrlDownload(documentId);
  if (res.ok) window.open(res.data.url, "_blank", "noopener,noreferrer");
  else toast.error(res.erro);
}

export function GaleriaDocumentos({
  studentId,
  documentos,
}: {
  studentId: string;
  documentos: Document[];
}) {
  const router = useRouter();

  async function excluir(id: string) {
    const res = await excluirDocumento(id, studentId);
    if (res.ok) {
      toast.success("Documento removido.");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  if (documentos.length === 0) {
    return <p className="text-sm text-muted-foreground">Nenhum documento enviado ainda.</p>;
  }

  const porCategoria = DOC_KINDS.map((k) => ({
    kind: k,
    docs: documentos.filter((d) => d.kind === k),
  })).filter((g) => g.docs.length > 0);

  return (
    <div className="flex flex-col gap-6">
      {porCategoria.map((grupo) => (
        <section key={grupo.kind} className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-muted-foreground">
            {rotuloDocKind[grupo.kind as DocKind]}
          </h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {grupo.docs.map((d) => {
              const isImg = d.mime_type.startsWith("image/");
              return (
                <li key={d.id} className="flex items-center gap-3 rounded-lg border p-3">
                  {isImg ? (
                    <ImageIcon className="size-6 shrink-0 text-muted-foreground" />
                  ) : (
                    <FileIcon className="size-6 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{d.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {d.taken_at ? `${formatarData(d.taken_at)} · ` : ""}
                      {formatarTamanho(d.size_bytes)}
                    </p>
                  </div>
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Abrir documento"
                    onClick={() => abrir(d.id)}
                  >
                    <DownloadSimpleIcon className="size-4" />
                  </Button>
                  <ConfirmDialog
                    title="Excluir este documento?"
                    description="O documento será removido da ficha do aluno."
                    confirmLabel="Excluir"
                    destructive
                    onConfirm={() => excluir(d.id)}
                    trigger={
                      <Button size="icon" variant="ghost" aria-label="Excluir documento">
                        <TrashIcon className="size-4" />
                      </Button>
                    }
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
