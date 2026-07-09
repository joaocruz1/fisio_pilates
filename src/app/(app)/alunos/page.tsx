import Link from "next/link";
import { ListaAlunos } from "@/components/alunos/lista-alunos";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { listStudents } from "@/server/students";

export const metadata = { title: "Alunos" };

export default async function AlunosPage() {
  const alunos = await listStudents();
  return (
    <>
      <PageHeader title="Alunos" description="Sua carteira de alunos.">
        <Button asChild data-tour="alunos-novo">
          <Link href="/alunos/novo">Novo aluno</Link>
        </Button>
      </PageHeader>
      <div className="p-4 md:p-6">
        <ListaAlunos alunos={alunos} />
      </div>
    </>
  );
}
