import { GaleriaDocumentos } from "@/components/documentos/galeria-documentos";
import { UploadDocumento } from "@/components/documentos/upload-documento";
import { listDocuments } from "@/server/documents";

export default async function DocumentosPage({ params }: { params: Promise<{ alunoId: string }> }) {
  const { alunoId } = await params;
  const documentos = await listDocuments(alunoId);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Documentos</h2>
        <UploadDocumento studentId={alunoId} />
      </div>
      <GaleriaDocumentos studentId={alunoId} documentos={documentos} />
    </div>
  );
}
