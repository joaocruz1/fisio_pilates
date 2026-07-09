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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { DOC_KINDS, type DocKind, rotuloDocKind } from "@/lib/labels";
import { createClient } from "@/lib/supabase/client";
import { slugify } from "@/lib/utils";
import { confirmarUpload, criarUrlUpload } from "@/server/actions/documentos";

const BUCKET = "student-documents";

/** Envia UM arquivo pelo fluxo signed-URL de 3 passos. Retorna erro (string) ou null. */
async function enviarArquivo(
  studentId: string,
  file: File,
  meta: { kind: DocKind; takenAt: string; description: string },
): Promise<string | null> {
  const info = {
    fileName: file.name,
    mimeType: file.type || "application/octet-stream",
    sizeBytes: file.size,
  };
  const criado = await criarUrlUpload(studentId, info);
  if (!criado.ok) return criado.erro;

  const supabase = createClient();
  const { error: upErr } = await supabase.storage
    .from(BUCKET)
    .uploadToSignedUrl(criado.data.path, criado.data.token, file, { contentType: info.mimeType });
  if (upErr) return "Falha ao enviar o arquivo.";

  const conf = await confirmarUpload(studentId, {
    ...info,
    storagePath: criado.data.path,
    docId: criado.data.docId,
    meta,
  });
  return conf.ok ? null : conf.erro;
}

export function UploadDocumento({
  studentId,
  trigger,
  defaultKind = "lesson",
  title = "Importar aulas e documentos",
}: {
  studentId: string;
  /** Gatilho customizado (para reusar em cabeçalhos/abas). */
  trigger?: React.ReactNode;
  /** Categoria pré-selecionada (ex.: "lesson" na aba Aulas). */
  defaultKind?: DocKind;
  title?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [progresso, setProgresso] = useState("");

  // aba arquivos
  const [files, setFiles] = useState<File[]>([]);
  const [kind, setKind] = useState<DocKind>(defaultKind);
  const [takenAt, setTakenAt] = useState("");
  const [description, setDescription] = useState("");

  // aba texto
  const [titulo, setTitulo] = useState("");
  const [texto, setTexto] = useState("");
  const [textoData, setTextoData] = useState("");

  function limpar() {
    setFiles([]);
    setTakenAt("");
    setDescription("");
    setTitulo("");
    setTexto("");
    setTextoData("");
    setProgresso("");
  }

  async function enviarArquivos() {
    if (files.length === 0) return toast.error("Selecione ao menos um arquivo.");
    setEnviando(true);
    let erros = 0;
    try {
      for (let i = 0; i < files.length; i++) {
        setProgresso(`Enviando ${i + 1}/${files.length}…`);
        const err = await enviarArquivo(studentId, files[i] as File, {
          kind,
          takenAt,
          description,
        });
        if (err) erros++;
      }
      if (erros === 0) toast.success(`${files.length} documento(s) enviado(s).`);
      else toast.warning(`${files.length - erros} enviado(s), ${erros} com erro.`);
      setOpen(false);
      limpar();
      router.refresh();
    } finally {
      setEnviando(false);
    }
  }

  async function enviarTexto() {
    if (!titulo.trim() || !texto.trim()) return toast.error("Informe título e texto.");
    setEnviando(true);
    setProgresso("Salvando…");
    try {
      const nome = `${slugify(titulo).slice(0, 50) || "aula"}.txt`;
      const file = new File([texto], nome, { type: "text/plain" });
      const err = await enviarArquivo(studentId, file, {
        kind: "lesson",
        takenAt: textoData,
        description: titulo,
      });
      if (err) return void toast.error(err);
      toast.success("Aula registrada.");
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
        {trigger ?? (
          <Button size="sm">
            <UploadSimpleIcon className="size-4" /> Importar
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="arquivos">
          <TabsList className="w-full">
            <TabsTrigger value="arquivos" className="flex-1">
              Arquivos
            </TabsTrigger>
            <TabsTrigger value="texto" className="flex-1">
              Colar texto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="arquivos" className="flex flex-col gap-4 pt-2">
            <Field>
              <FieldLabel htmlFor="doc-files">
                Arquivos (PDF, Word, imagens ou texto — vários de uma vez)
              </FieldLabel>
              <Input
                id="doc-files"
                type="file"
                multiple
                accept="application/pdf,image/jpeg,image/png,image/webp,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
              />
              {files.length > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {files.length} arquivo(s) selecionado(s)
                </p>
              ) : null}
            </Field>
            <div className="grid grid-cols-2 gap-3">
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
                <FieldLabel htmlFor="doc-date">Data</FieldLabel>
                <Input
                  id="doc-date"
                  type="date"
                  value={takenAt}
                  onChange={(e) => setTakenAt(e.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="doc-desc">Descrição (opcional)</FieldLabel>
              <Input
                id="doc-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </Field>
            <DialogFooter>
              <Button onClick={enviarArquivos} disabled={enviando || files.length === 0}>
                {enviando ? progresso || "Enviando…" : `Enviar ${files.length || ""}`.trim()}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="texto" className="flex flex-col gap-4 pt-2">
            <p className="text-xs text-muted-foreground">
              Cole aqui o texto de uma aula/histórico. Vira parte do conhecimento que a IA usa.
            </p>
            <div className="grid grid-cols-2 gap-3">
              <Field>
                <FieldLabel htmlFor="txt-titulo">Título</FieldLabel>
                <Input
                  id="txt-titulo"
                  placeholder="Ex.: Aula 12/03"
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="txt-data">Data</FieldLabel>
                <Input
                  id="txt-data"
                  type="date"
                  value={textoData}
                  onChange={(e) => setTextoData(e.target.value)}
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="txt-conteudo">Texto da aula</FieldLabel>
              <Textarea
                id="txt-conteudo"
                rows={8}
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
              />
            </Field>
            <DialogFooter>
              <Button onClick={enviarTexto} disabled={enviando || !titulo.trim() || !texto.trim()}>
                {enviando ? "Salvando…" : "Salvar aula"}
              </Button>
            </DialogFooter>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
