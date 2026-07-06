import { AlunoForm } from "@/components/alunos/aluno-form";
import { PageHeader } from "@/components/shared/page-header";

export const metadata = { title: "Novo aluno" };

export default function NovoAlunoPage() {
  return (
    <>
      <PageHeader title="Novo aluno" description="Cadastre um novo aluno." />
      <div className="mx-auto w-full max-w-2xl p-4 md:p-6">
        <AlunoForm />
      </div>
    </>
  );
}
