import { UploadSimpleIcon } from "@phosphor-icons/react/ssr";
import { AcoesAluno } from "@/components/alunos/acoes-aluno";
import { AlunoTabs } from "@/components/alunos/aluno-tabs";
import { UploadDocumento } from "@/components/documentos/upload-documento";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { rotuloStatusAluno, type StatusAluno } from "@/lib/labels";
import { idadeAnos, linkWhatsApp } from "@/lib/utils";
import { getStudent } from "@/server/students";

/** Cabeçalho fixo do aluno + abas (navegáveis por URL). */
export default async function AlunoLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ alunoId: string }>;
}) {
  const { alunoId } = await params;
  const aluno = await getStudent(alunoId);
  const idade = idadeAnos(aluno.birth_date);
  const whats = linkWhatsApp(aluno.phone);
  const statusLabel = rotuloStatusAluno[aluno.status as StatusAluno] ?? aluno.status;

  return (
    <div className="flex flex-col">
      <div className="flex items-start justify-between gap-3 border-b p-4 md:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-xl font-semibold">{aluno.full_name}</h1>
            <Badge variant={aluno.status === "active" ? "default" : "secondary"}>
              {statusLabel}
            </Badge>
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {idade != null ? `${idade} anos` : "Idade não informada"}
            {aluno.phone ? (
              <>
                {" · "}
                {whats ? (
                  <a
                    href={whats}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {aluno.phone}
                  </a>
                ) : (
                  aluno.phone
                )}
              </>
            ) : null}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <UploadDocumento
            studentId={alunoId}
            title="Importar aulas e documentos"
            trigger={
              <Button size="sm" variant="outline">
                <UploadSimpleIcon className="size-4" /> Importar
              </Button>
            }
          />
          <AcoesAluno id={aluno.id} status={aluno.status} />
        </div>
      </div>

      <div data-tour="aluno-abas">
        <AlunoTabs base={`/alunos/${alunoId}`} />
      </div>
      {children}
    </div>
  );
}
