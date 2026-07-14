import { AnexosAvaliacao } from "@/components/avaliacao/anexos-avaliacao";
import { AvaliacaoForm } from "@/components/avaliacao/avaliacao-form";
import { getAssessment, listDocumentosAvaliacao } from "@/server/assessments";

export default async function EditarAvaliacaoPage({
  params,
}: {
  params: Promise<{ alunoId: string; avaliacaoId: string }>;
}) {
  const { alunoId, avaliacaoId } = await params;
  const [avaliacao, documentos] = await Promise.all([
    getAssessment(avaliacaoId),
    listDocumentosAvaliacao(avaliacaoId),
  ]);
  return (
    <div className="mx-auto w-full max-w-2xl p-4 md:p-6">
      <h1 className="mb-4 text-lg font-semibold">Editar avaliação</h1>
      <AvaliacaoForm studentId={alunoId} avaliacao={avaliacao} />
      <div className="mt-4">
        <AnexosAvaliacao studentId={alunoId} assessmentId={avaliacaoId} documentos={documentos} />
      </div>
    </div>
  );
}
