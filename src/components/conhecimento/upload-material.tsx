"use client";

import { LinkSimpleIcon, UploadSimpleIcon } from "@phosphor-icons/react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { createClient } from "@/lib/supabase/client";
import {
  adicionarLinkKb,
  confirmarUploadKb,
  criarUrlUploadKb,
} from "@/server/actions/conhecimento";

const BUCKET = "kb-sources";
const ACCEPT =
  "application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain,image/jpeg,image/png,image/webp";

export function UploadMaterial() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [licenseOk, setLicenseOk] = useState(false);

  // aba arquivo
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");

  // aba link
  const [url, setUrl] = useState("");
  const [linkTitle, setLinkTitle] = useState("");

  function limpar() {
    setFile(null);
    setTitle("");
    setUrl("");
    setLinkTitle("");
    setLicenseOk(false);
  }

  async function enviarArquivo() {
    if (!file) return toast.error("Selecione um arquivo.");
    if (!title.trim()) return toast.error("Informe o título.");
    if (!licenseOk) return toast.error("Confirme a posse legal do material.");

    setEnviando(true);
    try {
      const mimeType = file.type || "application/octet-stream";
      const criado = await criarUrlUploadKb({
        fileName: file.name,
        mimeType,
        sizeBytes: file.size,
      });
      if (!criado.ok) return void toast.error(criado.erro);

      const supabase = createClient();
      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .uploadToSignedUrl(criado.data.path, criado.data.token, file, { contentType: mimeType });
      if (upErr) return void toast.error("Falha ao enviar o arquivo.");

      const conf = await confirmarUploadKb({
        docId: criado.data.docId,
        storagePath: criado.data.path,
        title,
        mimeType,
        licenseOk,
      });
      if (!conf.ok) return void toast.error(conf.erro);

      toast.success("Material indexado e disponível para a IA.");
      setOpen(false);
      limpar();
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  async function enviarLink() {
    if (!url.trim()) return toast.error("Cole o link.");
    if (!licenseOk) return toast.error("Confirme que pode usar este conteúdo.");

    setEnviando(true);
    try {
      const res = await adicionarLinkKb({ url, title: linkTitle, licenseOk });
      if (!res.ok) return void toast.error(res.erro);
      toast.success("Link lido e indexado para a IA.");
      setOpen(false);
      limpar();
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) limpar();
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <UploadSimpleIcon className="size-4" /> Adicionar à minha base
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adicionar à sua base de conhecimento</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="arquivo">
          <TabsList className="w-full">
            <TabsTrigger value="arquivo" className="flex-1">
              <UploadSimpleIcon className="size-4" /> Arquivo
            </TabsTrigger>
            <TabsTrigger value="link" className="flex-1">
              <LinkSimpleIcon className="size-4" /> Link
            </TabsTrigger>
          </TabsList>

          <TabsContent value="arquivo" className="flex flex-col gap-4 pt-2">
            <Field>
              <FieldLabel htmlFor="kb-title">Título</FieldLabel>
              <Input
                id="kb-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Protocolo de coluna — meu curso"
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="kb-file">
                Arquivo (PDF, Word, texto ou imagem — máx. 100 MB)
              </FieldLabel>
              <Input
                id="kb-file"
                type="file"
                accept={ACCEPT}
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </Field>
            <label
              htmlFor="kb-license-a"
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <Checkbox
                id="kb-license-a"
                checked={licenseOk}
                onCheckedChange={(v) => setLicenseOk(v === true)}
                className="mt-0.5"
              />
              Declaro que possuo este material legalmente e tenho direito de usá-lo.
            </label>
            <DialogFooter>
              <Button onClick={enviarArquivo} disabled={enviando || !file}>
                {enviando ? "Indexando…" : "Enviar e indexar"}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="link" className="flex flex-col gap-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Cole o link de um artigo, protocolo ou página. Baixamos o texto e o tornamos
              pesquisável pela IA.
            </p>
            <Field>
              <FieldLabel htmlFor="kb-url">Link (URL)</FieldLabel>
              <Input
                id="kb-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://..."
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="kb-linktitle">Título (opcional)</FieldLabel>
              <Input
                id="kb-linktitle"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="Se vazio, usamos o título da página"
              />
            </Field>
            <label
              htmlFor="kb-license-l"
              className="flex items-start gap-2 text-sm text-muted-foreground"
            >
              <Checkbox
                id="kb-license-l"
                checked={licenseOk}
                onCheckedChange={(v) => setLicenseOk(v === true)}
                className="mt-0.5"
              />
              Declaro que tenho direito de usar o conteúdo deste link.
            </label>
            <DialogFooter>
              <Button onClick={enviarLink} disabled={enviando || !url.trim()}>
                {enviando ? "Lendo o link…" : "Adicionar link"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
