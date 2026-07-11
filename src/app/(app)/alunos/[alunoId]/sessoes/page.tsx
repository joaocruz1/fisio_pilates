import { UploadSimpleIcon } from "@phosphor-icons/react/ssr";
import { format } from "date-fns";
import Link from "next/link";
import { AgendamentosAluno } from "@/components/agenda/agendamentos-aluno";
import { UploadDocumento } from "@/components/documentos/upload-documento";
import { GerarProximaAula } from "@/components/sessoes/gerar-proxima-aula";
import { HistoricoSessoes } from "@/components/sessoes/historico-sessoes";
import { Button } from "@/components/ui/button";
import { enriquecerAppointments, listAppointmentsDoAluno } from "@/server/agenda";
import { requireTenant } from "@/server/auth";
import { getPlanoAula } from "@/server/session-plans";
import { listSessions } from "@/server/sessions";
import { getStudent } from "@/server/students";

export default async function SessoesPage({ params }: { params: Promise<{ alunoId: string }> }) {
  const { alunoId } = await params;
  const hojeISO = format(new Date(), "yyyy-MM-dd");
  const [sessoes, proximasCrud, aluno, { tenant }] = await Promise.all([
    listSessions(alunoId),
    listAppointmentsDoAluno(alunoId, hojeISO),
    getStudent(alunoId),
    requireTenant(),
  ]);

  // Enriquece as próximas aulas (condições, última aula, plano) para o modal da
  // agenda funcionar igual aqui, e pré-busca o plano do aluno (se houver).
  const proximas = await enriquecerAppointments(proximasCrud);
  const planoReportId = proximas.find((p) => p.planoReportId)?.planoReportId ?? null;
  const plano = planoReportId ? await getPlanoAula(planoReportId) : null;

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold">Aulas</h2>
        <div data-tour="aluno-aulas-ia" className="flex flex-wrap gap-2">
          <UploadDocumento
            studentId={alunoId}
            defaultKind="lesson"
            title="Importar aulas (PDF, Word, texto)"
            trigger={
              <Button size="sm" variant="outline">
                <UploadSimpleIcon className="size-4" /> Importar aulas
              </Button>
            }
          />
          <GerarProximaAula studentId={alunoId} />
          <Button asChild size="sm">
            <Link href={`/alunos/${alunoId}/sessoes/nova`}>Registrar aula</Link>
          </Button>
        </div>
      </div>
      <AgendamentosAluno
        studentId={alunoId}
        studentName={aluno.full_name}
        proximas={proximas}
        plano={plano}
        studioName={tenant.name ?? null}
      />
      <HistoricoSessoes studentId={alunoId} sessoes={sessoes} />
    </div>
  );
}
