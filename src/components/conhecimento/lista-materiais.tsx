"use client";

import {
  ArrowClockwiseIcon,
  ArrowSquareOutIcon,
  FileTextIcon,
  ImageIcon,
  LinkSimpleIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { excluirKbDocumento, reprocessarKbDocumento } from "@/server/actions/conhecimento";
import type { KbDocument } from "@/server/knowledge";

function statusBadge(doc: KbDocument) {
  if (doc.status === "ready") return <Badge variant="default">Pronto</Badge>;
  if (doc.status === "failed") return <Badge variant="destructive">Erro</Badge>;
  if (doc.status === "processing") return <Badge variant="secondary">Processando…</Badge>;
  return <Badge variant="secondary">Na fila</Badge>;
}

function IconeFonte({ tipo }: { tipo: string }) {
  if (tipo === "url") return <LinkSimpleIcon className="size-4 text-muted-foreground" />;
  if (tipo === "image") return <ImageIcon className="size-4 text-muted-foreground" />;
  return <FileTextIcon className="size-4 text-muted-foreground" />;
}

function ItemMaterial({
  d,
  editavel,
  onExcluir,
  onReprocessar,
  reprocessando,
}: {
  d: KbDocument;
  editavel: boolean;
  onExcluir: (id: string) => void;
  onReprocessar: (id: string) => void;
  reprocessando: string | null;
}) {
  return (
    <li className="flex items-center justify-between gap-3 rounded-lg border p-3">
      <div className="flex min-w-0 items-start gap-2.5">
        <span className="mt-0.5">
          <IconeFonte tipo={d.source_type} />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="truncate font-medium">{d.title}</span>
            {statusBadge(d)}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {d.chunk_count > 0 ? <span>{d.chunk_count} trechos indexados</span> : null}
            {d.source_type === "url" && d.source_url ? (
              <a
                href={d.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <ArrowSquareOutIcon className="size-3" /> abrir link
              </a>
            ) : null}
          </div>
          {d.status === "failed" && d.error_message ? (
            <p className="mt-0.5 text-xs text-destructive">{d.error_message}</p>
          ) : null}
        </div>
      </div>
      {editavel ? (
        <div className="flex shrink-0 items-center gap-1">
          {d.status === "queued" || d.status === "failed" ? (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onReprocessar(d.id)}
              disabled={reprocessando === d.id}
            >
              <ArrowClockwiseIcon
                className={reprocessando === d.id ? "size-4 animate-spin" : "size-4"}
              />
              {reprocessando === d.id ? "Processando…" : "Reprocessar"}
            </Button>
          ) : null}
          <ConfirmDialog
            title="Excluir este material?"
            description="O material e os trechos indexados serão removidos da sua base."
            confirmLabel="Excluir"
            destructive
            onConfirm={() => onExcluir(d.id)}
            trigger={
              <Button size="icon" variant="ghost" aria-label="Excluir material">
                <TrashIcon className="size-4" />
              </Button>
            }
          />
        </div>
      ) : null}
    </li>
  );
}

export function ListaMateriais({ documentos }: { documentos: KbDocument[] }) {
  const router = useRouter();
  const [reprocessando, setReprocessando] = useState<string | null>(null);

  const meus = documentos.filter((d) => d.scope === "tenant");
  const sistema = documentos.filter((d) => d.scope === "global");

  async function excluir(id: string) {
    const res = await excluirKbDocumento(id);
    if (res.ok) {
      toast.success("Material removido.");
      router.refresh();
    } else {
      toast.error(res.erro);
    }
  }

  async function reprocessar(id: string) {
    setReprocessando(id);
    try {
      const res = await reprocessarKbDocumento(id);
      if (res.ok) {
        toast.success("Material processado.");
        router.refresh();
      } else {
        toast.error(res.erro);
      }
    } finally {
      setReprocessando(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h3 className="font-heading text-sm font-semibold">Sua base</h3>
        {meus.length === 0 ? (
          <p className="rounded-lg border border-dashed p-3 text-sm text-muted-foreground">
            Você ainda não adicionou materiais. Envie arquivos ou links dos seus cursos, protocolos
            e referências — eles passam a alimentar a IA junto com a base do sistema.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {meus.map((d) => (
              <ItemMaterial
                key={d.id}
                d={d}
                editavel
                onExcluir={excluir}
                onReprocessar={reprocessar}
                reprocessando={reprocessando}
              />
            ))}
          </ul>
        )}
      </section>

      {sistema.length > 0 ? (
        <section className="flex flex-col gap-2">
          <h3 className="font-heading text-sm font-semibold">
            Base do sistema{" "}
            <span className="font-normal text-muted-foreground">
              · curada pela plataforma, sempre disponível
            </span>
          </h3>
          <ul className="flex flex-col gap-2">
            {sistema.map((d) => (
              <ItemMaterial
                key={d.id}
                d={d}
                editavel={false}
                onExcluir={excluir}
                onReprocessar={reprocessar}
                reprocessando={reprocessando}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
