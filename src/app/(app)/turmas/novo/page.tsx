import { PageHeader } from "@/components/shared/page-header";
import { TurmaForm } from "@/components/turmas/turma-form";

export const metadata = { title: "Nova turma" };

export default function NovaTurmaPage() {
  return (
    <>
      <PageHeader title="Nova turma" description="Crie uma aula coletiva com alunas recorrentes." />
      <div className="mx-auto w-full max-w-2xl p-4 md:p-6">
        <TurmaForm />
      </div>
    </>
  );
}
