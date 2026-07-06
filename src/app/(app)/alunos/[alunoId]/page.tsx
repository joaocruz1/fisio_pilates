import { AlunoForm } from "@/components/alunos/aluno-form";
import { formatarData } from "@/lib/utils";
import { getStudent } from "@/server/students";

export default async function AlunoDadosPage({ params }: { params: Promise<{ alunoId: string }> }) {
  const { alunoId } = await params;
  const aluno = await getStudent(alunoId);

  return (
    <div className="mx-auto w-full max-w-2xl p-4 md:p-6">
      <p className="mb-4 text-sm text-muted-foreground">
        {aluno.consent_signed_at
          ? `Consentimento LGPD registrado em ${formatarData(aluno.consent_signed_at)}.`
          : "Consentimento LGPD ainda não registrado."}
      </p>
      <AlunoForm aluno={aluno} />
    </div>
  );
}
