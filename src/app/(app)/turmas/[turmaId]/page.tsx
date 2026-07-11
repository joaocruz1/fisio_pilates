import { PageHeader } from "@/components/shared/page-header";
import { TurmaDetalhe } from "@/components/turmas/turma-tabs";
import { listStudents } from "@/server/students";
import { getTurmaComAlunos, listClassSessionsDaTurma } from "@/server/turmas";

export const metadata = { title: "Turma" };

export default async function TurmaPage({ params }: { params: Promise<{ turmaId: string }> }) {
  const { turmaId } = await params;
  const [{ turma, alunos }, sessoes, todosAlunos] = await Promise.all([
    getTurmaComAlunos(turmaId),
    listClassSessionsDaTurma(turmaId),
    listStudents(),
  ]);

  // Alunas disponíveis para adicionar = ativas que ainda não estão na turma.
  const naTurma = new Set(alunos.map((a) => a.id));
  const disponiveis = todosAlunos
    .filter((a) => a.status === "active" && !naTurma.has(a.id))
    .map((a) => ({ id: a.id, full_name: a.full_name }));

  return (
    <>
      <PageHeader title={turma.name} description="Aula coletiva" />
      <div className="p-4 md:p-6">
        <TurmaDetalhe turma={turma} alunos={alunos} disponiveis={disponiveis} sessoes={sessoes} />
      </div>
    </>
  );
}
