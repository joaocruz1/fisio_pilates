import Link from "next/link";
import { HistoricoSessoes } from "@/components/sessoes/historico-sessoes";
import { Button } from "@/components/ui/button";
import { listSessions } from "@/server/sessions";

export default async function SessoesPage({ params }: { params: Promise<{ alunoId: string }> }) {
  const { alunoId } = await params;
  const sessoes = await listSessions(alunoId);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Sessões</h2>
        <Button asChild size="sm">
          <Link href={`/alunos/${alunoId}/sessoes/nova`}>Registrar sessão</Link>
        </Button>
      </div>
      <HistoricoSessoes studentId={alunoId} sessoes={sessoes} />
    </div>
  );
}
