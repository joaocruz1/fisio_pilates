import { CalendarCheckIcon, UserPlusIcon, UsersIcon, WarningIcon } from "@phosphor-icons/react/ssr";
import { format } from "date-fns";
import Link from "next/link";
import { ModeloBadge } from "@/components/dashboard/modelo-badge";
import { CountUp, HoverCard } from "@/components/motion";
import { EmptyState } from "@/components/shared/empty-state";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { rotuloStatusSessao, type StatusSessao } from "@/lib/labels";
import { cn, formatarData } from "@/lib/utils";
import { listAppointments } from "@/server/agenda";
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
  chip,
}: {
  icon: typeof UsersIcon;
  label: string;
  value: number;
  chip: string;
}) {
  return (
    <HoverCard>
      <Card className="h-full">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <span className={cn("flex size-8 items-center justify-center rounded-lg", chip)}>
              <Icon className="size-4" weight="fill" />
            </span>
            {label}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <span className="font-heading text-3xl font-semibold">
            <CountUp value={value} />
          </span>
        </CardContent>
      </Card>
    </HoverCard>
  );
}

export default async function DashboardPage() {
  const hojeISO = format(new Date(), "yyyy-MM-dd");
  const [{ profile }, stats, aulasHoje] = await Promise.all([
    requireTenant(),
    getDashboardStats(),
    listAppointments(hojeISO, hojeISO),
  ]);

  return (
    <>
      <PageHeader title={saudacao(profile.full_name)} description="Aqui está o resumo do seu dia.">
        <div className="flex items-center gap-2">
          <ModeloBadge />
          <Button asChild>
            <Link href="/alunos/novo">Novo aluno</Link>
          </Button>
        </div>
      </PageHeader>

      <div className="flex flex-col gap-6 p-4 md:p-6">
        <div data-tour="dash-stats" className="grid gap-4 sm:grid-cols-3">
          <Stat
            icon={UsersIcon}
            label="Alunos ativos"
            value={stats.alunosAtivos}
            chip="bg-primary/10 text-primary"
          />
          <Stat
            icon={CalendarCheckIcon}
            label="Aulas na semana"
            value={stats.sessoesSemana}
            chip="bg-info/12 text-info"
          />
          <Stat
            icon={WarningIcon}
            label="Precisam de atenção"
            value={stats.precisamAtencao.length}
            chip="bg-warning/20 text-warning-foreground"
          />
        </div>

        <section data-tour="dash-hoje" className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-semibold">Agenda de hoje</h2>
            <Button asChild variant="ghost" size="sm">
              <Link href="/agenda">Ver agenda</Link>
            </Button>
          </div>
          {aulasHoje.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma aula agendada para hoje.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {aulasHoje.map((ag) => (
                <li
                  key={ag.id}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-xl border p-3",
                    ag.status === "cancelled" && "opacity-55",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-semibold tabular-nums">
                      {ag.start_time.slice(0, 5)}
                    </span>
                    <Link href={`/alunos/${ag.student_id}`} className="font-medium hover:underline">
                      {ag.students?.full_name ?? "Aluno"}
                    </Link>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {rotuloStatusSessao[ag.status as StatusSessao]}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {stats.alunosAtivos === 0 ? (
          <EmptyState
            icon={UserPlusIcon}
            title="Você ainda não tem alunos ativos"
            description="Cadastre um aluno para começar a registrar aulas e acompanhar a evolução."
            action={
              <Button asChild>
                <Link href="/alunos/novo">Cadastrar aluno</Link>
              </Button>
            }
          />
        ) : stats.precisamAtencao.length > 0 ? (
          <section className="flex flex-col gap-3">
            <h2 className="font-heading font-semibold">Precisam de atenção</h2>
            <p className="text-sm text-muted-foreground">
              Alunos sem aula registrada há mais de 15 dias.
            </p>
            <ul className="flex flex-col gap-2">
              {stats.precisamAtencao.map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/alunos/${a.id}`}
                    className="flex items-center justify-between gap-3 rounded-xl border border-warning/30 bg-warning/5 p-3 transition-colors hover:bg-warning/10"
                  >
                    <span className="font-medium">{a.full_name}</span>
                    <span className="text-sm text-muted-foreground">
                      {a.ultimaSessao ? `Última: ${formatarData(a.ultimaSessao)}` : "Sem aulas"}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <p className="text-sm text-muted-foreground">
            Tudo em dia — nenhum aluno sem aula recente. 🎉
          </p>
        )}
      </div>
    </>
  );
}
