import { AvaliacaoForm } from "@/components/avaliacao/avaliacao-form";
import { getAssessment } from "@/server/assessments";

export default async function EditarAvaliacaoPage({
  params,
}: {
  params: Promise<{ alunoId: string; avaliacaoId: string }>;
}) {
  const { alunoId, avaliacaoId } = await params;
  const avaliacao = await getAssessment(avaliacaoId);
  return (
    <div className="mx-auto w-full max-w-2xl p-4 md:p-6">
      <h1 className="mb-4 text-lg font-semibold">Editar avaliação</h1>
      <AvaliacaoForm studentId={alunoId} avaliacao={avaliacao} />
    </div>
  );
}
