import { CalendarCheckIcon, UserPlusIcon, UsersIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireTenant } from "@/server/auth";

export const metadata = { title: "Início" };

function saudacao(nome: string) {
  const h = new Date().getHours();
  const parte = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const primeiroNome = nome.trim().split(" ")[0] || "";
  return primeiroNome ? `${parte}, ${primeiroNome}` : parte;
}

export default async function DashboardPage() {
  const { profile } = await requireTenant();

  return (
    <>
      <PageHeader
        title={saudacao(profile.full_name)}
        description="Aqui está o resumo do seu dia."
      />
      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <UsersIcon className="size-4" /> Alunos ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-semibold">0</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <CalendarCheckIcon className="size-4" /> Sessões na semana
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-semibold">0</span>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Precisam de atenção
              </CardTitle>
            </CardHeader>
            <CardContent>
              <span className="text-3xl font-semibold">0</span>
            </CardContent>
          </Card>
        </div>

        <EmptyState
          icon={UserPlusIcon}
          title="Você ainda não tem alunos"
          description="Cadastre sua primeira aluna para começar a registrar sessões e acompanhar a evolução."
          action={
            <Button asChild>
              <Link href="/alunos/novo">Cadastrar aluno</Link>
            </Button>
          }
        />
      </div>
    </>
  );
}
