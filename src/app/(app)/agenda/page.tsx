import { addDays, format, parseISO, startOfWeek } from "date-fns";
import Link from "next/link";
import { AgendaDia } from "@/components/agenda/agenda-dia";
import { AgendaSemana } from "@/components/agenda/agenda-semana";
import { PageHeader } from "@/components/shared/page-header";
import type { PlanoAula } from "@/lib/ai/schemas/plano-aula";
import { cn } from "@/lib/utils";
import {
  enriquecerAppointments,
  getAgendaDia,
  getAgendaDiaColetiva,
  listAppointments,
  listClassSessionsInterval,
} from "@/server/agenda";
import { requireTenant } from "@/server/auth";
import { getPlanoAula } from "@/server/session-plans";
import { listStudents } from "@/server/students";
import { getDadosModaisColetiva } from "@/server/turmas";

export const metadata = { title: "Agenda" };

function validaISO(s?: string): Date {
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const d = parseISO(s);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return new Date();
}

function Alternador({ view }: { view: "dia" | "semana" }) {
  const opcoes = [
    { chave: "dia", label: "Dia", href: "/agenda?view=dia" },
    { chave: "semana", label: "Semana", href: "/agenda?view=semana" },
  ] as const;
  return (
    <div data-tour="agenda-alternador" className="inline-flex rounded-lg border bg-muted/40 p-0.5">
      {opcoes.map((o) => (
        <Link
          key={o.chave}
          href={o.href}
          className={cn(
            "rounded-md px-3 py-1 text-sm font-medium transition-colors",
            view === o.chave
              ? "bg-background text-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}

export default async function AgendaPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; semana?: string; dia?: string }>;
}) {
  const { view, semana, dia } = await searchParams;
  const modo: "dia" | "semana" = view === "semana" ? "semana" : "dia";
  const [{ tenant }, alunosRaw] = await Promise.all([requireTenant(), listStudents()]);
  const alunos = alunosRaw.map((a) => ({ id: a.id, full_name: a.full_name }));
  const studioName = tenant.name ?? null;

  return (
    <>
      <PageHeader
        title="Agenda"
        description="Suas aulas do dia e da semana, com o contexto de cada aluno."
      />
      <div className="flex flex-col gap-4 p-4 md:p-6">
        <Alternador view={modo} />
        {modo === "dia"
          ? await ConteudoDia(dia, alunos, studioName)
          : await ConteudoSemana(semana, alunos, studioName)}
      </div>
    </>
  );
}

/**
 * Pré-busca em paralelo os planos de IA (`next_session`) dos atendimentos que
 * já têm `planoReportId`, num mapa reportId → PlanoAula. Só busca os ids
 * distintos presentes nos itens enriquecidos — poucos por tela.
 */
async function prefetchPlanosIndividuais(
  reportIds: string[],
): Promise<Record<string, PlanoAula | null>> {
  const unicos = [...new Set(reportIds.filter(Boolean))];
  if (unicos.length === 0) return {};
  const entradas = await Promise.all(
    unicos.map(async (id) => [id, await getPlanoAula(id)] as const),
  );
  return Object.fromEntries(entradas);
}

async function ConteudoDia(
  dia: string | undefined,
  alunos: { id: string; full_name: string }[],
  studioName: string | null,
) {
  const diaISO = format(validaISO(dia), "yyyy-MM-dd");
  const [itens, coletivas] = await Promise.all([
    getAgendaDia(diaISO),
    getAgendaDiaColetiva(diaISO),
  ]);
  const [modais, planosIndividuais] = await Promise.all([
    getDadosModaisColetiva(coletivas),
    prefetchPlanosIndividuais(itens.map((i) => i.planoReportId ?? "")),
  ]);
  return (
    <AgendaDia
      diaISO={diaISO}
      itens={itens}
      coletivas={coletivas}
      modais={modais}
      planosIndividuais={planosIndividuais}
      alunos={alunos}
      studioName={studioName}
    />
  );
}

async function ConteudoSemana(
  semana: string | undefined,
  alunos: { id: string; full_name: string }[],
  studioName: string | null,
) {
  const inicio = startOfWeek(validaISO(semana), { weekStartsOn: 1 });
  const inicioISO = format(inicio, "yyyy-MM-dd");
  const fimISO = format(addDays(inicio, 6), "yyyy-MM-dd");
  const [appointments, coletivas] = await Promise.all([
    listAppointments(inicioISO, fimISO),
    listClassSessionsInterval(inicioISO, fimISO),
  ]);
  // Enriquece os atendimentos da semana (condições, última aula, plano) —
  // mesmo enriquecimento do dia, para o modal individual funcionar igual.
  const individuais = await enriquecerAppointments(appointments);
  const [modais, planosIndividuais] = await Promise.all([
    getDadosModaisColetiva(coletivas),
    prefetchPlanosIndividuais(individuais.map((i) => i.planoReportId ?? "")),
  ]);
  return (
    <AgendaSemana
      semanaISO={inicioISO}
      individuais={individuais}
      coletivas={coletivas}
      modais={modais}
      planosIndividuais={planosIndividuais}
      alunos={alunos}
      studioName={studioName}
    />
  );
}
