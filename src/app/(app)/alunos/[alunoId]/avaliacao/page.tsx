import Link from "next/link";
import { CondicoesAluno } from "@/components/avaliacao/condicoes-aluno";
import { ListaAvaliacoes } from "@/components/avaliacao/lista-avaliacoes";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { listAssessments } from "@/server/assessments";
import { listConditions } from "@/server/conditions";

export default async function AvaliacaoPage({ params }: { params: Promise<{ alunoId: string }> }) {
  const { alunoId } = await params;
  const [condicoes, avaliacoes] = await Promise.all([
    listConditions(alunoId),
    listAssessments(alunoId),
  ]);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <CondicoesAluno studentId={alunoId} condicoes={condicoes} />
      <Separator />
      <section className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Avaliações</h2>
          <Button asChild size="sm">
            <Link href={`/alunos/${alunoId}/avaliacao/nova`}>Nova avaliação</Link>
          </Button>
        </div>
        <ListaAvaliacoes studentId={alunoId} avaliacoes={avaliacoes} />
      </section>
    </div>
  );
}
