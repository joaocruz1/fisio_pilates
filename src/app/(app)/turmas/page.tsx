import Link from "next/link";
import { PageHeader } from "@/components/shared/page-header";
import { ListaTurmas } from "@/components/turmas/lista-turmas";
import { Button } from "@/components/ui/button";
import { listTurmas } from "@/server/turmas";

export const metadata = { title: "Turmas" };

export default async function TurmasPage() {
  const turmas = await listTurmas();
  return (
    <>
      <PageHeader title="Turmas" description="Aulas coletivas com várias alunas no mesmo horário.">
        <Button asChild>
          <Link href="/turmas/novo">Nova turma</Link>
        </Button>
      </PageHeader>
      <div className="p-4 md:p-6">
        <ListaTurmas turmas={turmas} />
      </div>
    </>
  );
}
