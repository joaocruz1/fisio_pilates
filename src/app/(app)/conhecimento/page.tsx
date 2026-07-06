import { ListaMateriais } from "@/components/conhecimento/lista-materiais";
import { UploadMaterial } from "@/components/conhecimento/upload-material";
import { PageHeader } from "@/components/shared/page-header";
import { listKbDocuments } from "@/server/knowledge";

export const metadata = { title: "Base de Conhecimento" };

export default async function ConhecimentoPage() {
  const documentos = await listKbDocuments();

  return (
    <>
      <PageHeader title="Base de Conhecimento" description="Materiais que alimentam a IA.">
        <UploadMaterial />
      </PageHeader>
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <p className="rounded-lg border border-dashed bg-muted/30 p-3 text-sm text-muted-foreground">
          Envie apenas materiais de Pilates e fisioterapia que você possui legalmente. Eles são
          processados e usados como referência técnica pela IA — nunca ficam visíveis para os
          alunos.
        </p>
        <ListaMateriais documentos={documentos} />
      </div>
    </>
  );
}
