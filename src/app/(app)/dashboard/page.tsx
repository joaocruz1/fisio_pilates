import { CalendarCheckIcon, UserPlusIcon, UsersIcon, WarningIcon } from "@phosphor-icons/react/ssr";
import Link from "next/link";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatarData } from "@/lib/utils";
import { requireTenant } from "@/server/auth";
import { getDashboardStats } from "@/server/dashboard";

export const metadata = { title: "Início" };

function saudacao(nome: string) {
  const h = new Date().getHours();
  const parte = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  const primeiro = nome.trim().split(" ")[0] || "";
  return primeiro ? `${parte}, ${primeiro}` : parte;
}

function Stat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof UsersIcon;
  label: string;
  value: number;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="size-4" /> {label}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <span className="text-3xl font-semibold">{value}</span>
      </CardContent>
    </Card>
  );
}

export default async function DashboardPage() {
  const [{ profile }, stats] = await Promise.all([requireTenant(), getDashboardStats()]);

  return (
    <>
      <PageHeader title={saudacao(profile.full_name)} description="Resumo do seu dia.">
        <Button asChild>
          <Link href="/alunos/novo">Novo aluno</Link>
        </Button>
      </PageHeader>

      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <Stat icon={UsersIcon} label="Alunos ativos" value={stats.alunosAtivos} />
          <Stat icon={CalendarCheckIcon} label="Sessões na semana" value={stats.sessoesSemana} />
          <Stat
            icon={WarningIcon}
            label="Precisam de atenção"
            value={stats.precisamAtencao.length}
          />
        </div>

        {stats.alunosAtivos === 0 ? (
          <EmptyState
            icon={UserPlusIcon}
            title="Você ainda não tem alunos ativos"
            description="Cadastre um aluno para começar a registrar sessões e acompanhar a evolução."
            action={
              <Button asChild>
                <Link href="/alunos/novo">Cadastrar aluno</Link>
              </Button>
            }
          />
        ) : stats.precisamAtencao.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="font-semibold">Precisam de atenção</h2>
            <p className="text-sm text-muted-foreground">
              Alunos sem sessão registrada há mais de 15 dias.
            </p>
            <ul className="flex flex-col gap-2">
              {stats.precisamAtencao.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/alunos/${a.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3 hover:bg-accent"
                  >
                    <span className="font-medium">{a.full_name}</span>
                    <span className="text-sm text-muted-foreground">
                      {a.ultimaSessao ? `Última: ${formatarData(a.ultimaSessao)}` : "Sem sessões"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="text-sm text-muted-foreground">
            Tudo em dia — nenhum aluno sem sessão recente. 🎉
          </p>
        )}
      </div>
    </>
  );
}
