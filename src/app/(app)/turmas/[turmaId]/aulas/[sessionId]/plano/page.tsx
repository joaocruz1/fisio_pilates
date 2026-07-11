import { ArrowLeftIcon, SparkleIcon } from "@phosphor-icons/react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared/page-header";
import { GerarPlanoColetivo } from "@/components/turmas/gerar-plano-coletivo";
import { PlanoColetivoView } from "@/components/turmas/plano-coletivo-view";
import { Button } from "@/components/ui/button";
import { getClassSession, getPlanoColetivoViewData, getTurma } from "@/server/turmas";

export const metadata = { title: "Plano da aula coletiva" };

export default async function PlanoColetivoPage({
  params,
}: {
  params: Promise<{ turmaId: string; sessionId: string }>;
}) {
  const { turmaId, sessionId } = await params;
  // valida turma + ocorrência (RLS; 404 se não pertencer ao tenant)
  const [turma, sessao] = await Promise.all([getTurma(turmaId), getClassSession(sessionId)]);
  if (sessao.class_group_id !== turmaId) notFound();

  const view = await getPlanoColetivoViewData(sessionId);

  // Sem plano gerado ainda: oferece a geração.
  if (!view.temPlano) {
    return (
      <>
        <PageHeader
          title={`${turma.name} — Plano da aula`}
          description="Aula coletiva com rotação de aparelhos"
        />
        <div className="p-4 md:p-6">
          <div className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-xl border border-dashed p-10 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
              <SparkleIcon className="size-5" />
            </span>
            <p className="font-medium">Ainda não há plano para esta aula.</p>
            <p className="text-sm text-muted-foreground">
              Gere com a IA o plano coletivo com rotação de aparelhos entre as alunas.
            </p>
            <GerarPlanoColetivo turmaId={turmaId} sessionId={sessionId} />
            <Button asChild size="sm" variant="ghost">
              <Link href={`/turmas/${turmaId}`}>
                <ArrowLeftIcon className="size-4" /> Voltar à turma
              </Link>
            </Button>
          </div>
        </div>
      </>
    );
  }

  const emProcessamento = view.status === "processing";
  const falhou = view.status === "failed";

  return (
    <>
      <PageHeader
        title={`${turma.name} — Plano da aula`}
        description="Aula coletiva com rotação de aparelhos"
      />
      <div className="p-4 md:p-6">
        <div className="mx-auto flex max-w-5xl flex-col gap-4">
          <div className="flex items-center justify-between">
            <Button asChild size="sm" variant="ghost">
              <Link href={`/turmas/${turmaId}`}>
                <ArrowLeftIcon className="size-4" /> Voltar à turma
              </Link>
            </Button>
            <GerarPlanoColetivo turmaId={turmaId} sessionId={sessionId} />
          </div>

          {emProcessamento ? (
            <p className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Geração em andamento… recarregue em instantes.
            </p>
          ) : null}

          {falhou && view.errorMessage ? (
            <div className="rounded-lg border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive-foreground">
              <p className="font-medium">O plano tem problemas de rotação:</p>
              <p className="mt-1 text-xs">{view.errorMessage}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Revise o board abaixo e ajuste manualmente antes de aplicar.
              </p>
            </div>
          ) : null}

          {view.plano ? (
            <PlanoColetivoView
              plano={view.plano}
              alunos={view.alunos}
              estacoes={view.estacoes}
              avisos={view.plano.avisos ?? []}
            />
          ) : (
            <p className="rounded-lg border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
              Plano indisponível.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
