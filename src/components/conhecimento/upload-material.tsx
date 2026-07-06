"use client";

import { UploadSimpleIcon } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import { createClient } from "@/lib/supabase/client";
import { confirmarUploadKb, criarUrlUploadKb } from "@/server/actions/conhecimento";

const BUCKET = "kb-sources";

export function UploadMaterial() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [licenseOk, setLicenseOk] = useState(false);

  async function enviar() {
    if (!file) return toast.error("Selecione um PDF.");
    if (!title.trim()) return toast.error("Informe o título.");
    if (!licenseOk) return toast.error("Confirme a posse legal do material.");

    setEnviando(true);
    try {
      const criado = await criarUrlUploadKb({
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      });
      if (!criado.ok) return void toast.error(criado.erro);

      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .uploadToSignedUrl(criado.data.path, criado.data.token, file, {
          contentType: "application/pdf",
        });
      if (upErr) return void toast.error("Falha ao enviar o arquivo.");

      const conf = await confirmarUploadKb({
        docId: criado.data.docId,
        storagePath: criado.data.path,
        title,
        licenseOk,
      });
      if (!conf.ok) return void toast.error(conf.erro);

      toast.success("Material enviado. A ingestão será processada em segundo plano.");
      setOpen(false);
      setFile(null);
      setTitle("");
      setLicenseOk(false);
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <UploadSimpleIcon className="size-4" /> Enviar material
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Enviar material</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          <Field>
            <FieldLabel htmlFor="kb-title">Título</FieldLabel>
            <Input
              id="kb-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Pilates Clínico — Coluna"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="kb-file">Arquivo PDF (máx. 100 MB)</FieldLabel>
            <Input
              id="kb-file"
              type="file"
              accept="application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </Field>
          <label
            htmlFor="kb-license"
            className="flex items-start gap-2 text-sm text-muted-foreground"
          >
            <Checkbox
              id="kb-license"
              checked={licenseOk}
              onCheckedChange={(v) => setLicenseOk(v === true)}
              className="mt-0.5"
            />
            Declaro que possuo este material legalmente e tenho direito de usá-lo.
          </label>
        </div>
        <DialogFooter className="mt-2">
          <Button onClick={enviar} disabled={enviando || !file}>
            {enviando ? "Enviando…" : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
