"use client";

import { UploadSimpleIcon } from "@phosphor-icons/react";
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
import { DOC_KINDS, type DocKind, rotuloDocKind } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";
import { confirmarUpload, criarUrlUpload } from "@/server/actions/documentos";

const BUCKET = "student-documents";

export function UploadDocumento({ studentId }: { studentId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [kind, setKind] = useState<DocKind>("exam");
  const [takenAt, setTakenAt] = useState("");
  const [description, setDescription] = useState("");

  async function enviar() {
    if (!file) {
      toast.error("Selecione um arquivo.");
      return;
    }
    setEnviando(true);
    try {
      const info = { fileName: file.name, mimeType: file.type, sizeBytes: file.size };
      const criado = await criarUrlUpload(studentId, info);
      if (!criado.ok) {
        toast.error(criado.erro);
        return;
      }

      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .uploadToSignedUrl(criado.data.path, criado.data.token, file, { contentType: file.type });
      if (upErr) {
        toast.error("Falha ao enviar o arquivo.");
        return;
      }

      const confirmado = await confirmarUpload(studentId, {
        ...info,
        storagePath: criado.data.path,
        docId: criado.data.docId,
        meta: { kind, takenAt, description },
      });
      if (!confirmado.ok) {
        toast.error(confirmado.erro);
        return;
      }

      toast.success("Documento enviado.");
      setOpen(false);
      setFile(null);
      setTakenAt("");
      setDescription("");
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UploadSimpleIcon className="size-4" /> Enviar documento
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar documento</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="doc-file">Arquivo (PDF, JPG, PNG ou WEBP — máx. 25 MB)</FieldLabel>
            <Input
              id="doc-file"
              type="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="doc-kind">Categoria</FieldLabel>
            <Select value={kind} onValueChange={(v) => setKind(v as DocKind)}>
              <SelectTrigger id="doc-kind">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>
                    {rotuloDocKind[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="doc-date">Data do documento</FieldLabel>
            <Input
              id="doc-date"
              type="date"
              value={takenAt}
              onChange={(e) => setTakenAt(e.target.value)}
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="doc-desc">Descrição</FieldLabel>
            <Textarea
              id="doc-desc"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Field>
        </div>
        <DialogFooter className="mt-4">
          <Button onClick={enviar} disabled={enviando || !file}>
            {enviando ? "Enviando…" : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
