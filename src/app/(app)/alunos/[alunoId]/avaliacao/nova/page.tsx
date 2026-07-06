import { AvaliacaoForm } from "@/components/avaliacao/avaliacao-form";

export default async function NovaAvaliacaoPage({
  params,
}: {
  params: Promise<{ alunoId: string }>;
}) {
  const { alunoId } = await params;
  return (
    <div className="mx-auto w-full max-w-2xl p-4 md:p-6">
      <h1 className="mb-4 text-lg font-semibold">Nova avaliação</h1>
      <AvaliacaoForm studentId={alunoId} />
    </div>
  );
}
