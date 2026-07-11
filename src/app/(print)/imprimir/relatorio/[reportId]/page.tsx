import { notFound } from "next/navigation";
import { BotaoImprimir } from "@/components/print/botao-imprimir";
import { AVISO_IA, type Relatorio } from "@/lib/ai/schemas/relatorio";
import { formatarData } from "@/lib/utils";
import { requireTenant } from "@/server/auth";
import { getReport } from "@/server/reports";
import { getStudent } from "@/server/students";

export const metadata = { title: "Relatório de evolução" };

function Bloco({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="mt-5 break-inside-avoid">
      <h2 className="mb-1.5 border-b border-slate-200 pb-1 font-heading text-sm font-semibold uppercase tracking-wide text-slate-500">
        {titulo}
      </h2>
      <div className="text-[13px] leading-relaxed text-slate-800">{children}</div>
    </section>
  );
}

function Campo({ rotulo, texto }: { rotulo: string; texto?: string | null }) {
  if (!texto) return null;
  return (
    <p className="mt-2">
      <span className="font-semibold text-slate-900">{rotulo}: </span>
      {texto}
    </p>
  );
}

export default async function ImprimirRelatorioPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const { reportId } = await params;
  const [{ tenant }, report] = await Promise.all([requireTenant(), getReport(reportId)]);
  if (report?.status !== "completed" || !report.structured) notFound();
  // A impressão de relatório é por aluno; planos de aula coletiva não têm aluno único.
  if (!report.student_id) notFound();

  const aluno = await getStudent(report.student_id);
  const r = report.structured as unknown as Relatorio;
  const periodo =
    report.period_start && report.period_end
      ? `${formatarData(report.period_start)} a ${formatarData(report.period_end)}`
      : "Período completo";

  return (
    <>
      <BotaoImprimir />
      <div className="mx-auto max-w-[800px] bg-white p-8 text-slate-800 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        {/* Cabeçalho */}
        <header className="mb-6 flex items-start justify-between gap-4 border-b-2 border-slate-800 pb-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-500">
              {tenant.name ?? "Studio de Pilates"}
            </p>
            <h1 className="mt-1 font-heading text-2xl font-bold text-slate-900">
              Relatório de evolução
            </h1>
          </div>
          <div className="text-right text-xs text-slate-500">
            Emitido em
            <br />
            {formatarData(report.created_at.slice(0, 10))}
          </div>
        </header>

        {/* Identificação */}
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-4 text-[13px]">
          <p>
            <span className="font-semibold text-slate-900">Aluno(a): </span>
            {aluno.full_name}
          </p>
          <p>
            <span className="font-semibold text-slate-900">Período: </span>
            {periodo}
          </p>
        </div>

        <Bloco titulo="Resumo executivo">
          <p>{r.resumo_executivo}</p>
        </Bloco>

        <Bloco titulo="Evolução no Pilates">
          <Campo
            rotulo="Progressão de exercícios"
            texto={r.evolucao_pilates?.progressao_exercicios}
          />
          <Campo rotulo="Carga e complexidade" texto={r.evolucao_pilates?.carga_e_complexidade} />
          <Campo rotulo="Aderência" texto={r.evolucao_pilates?.aderencia} />
        </Bloco>

        <Bloco titulo="Evolução corporal">
          <Campo rotulo="Medidas e tendências" texto={r.evolucao_corporal?.medidas_e_tendencias} />
          <Campo rotulo="Dor e queixas" texto={r.evolucao_corporal?.dor_e_queixas} />
          <Campo
            rotulo="Observações posturais"
            texto={r.evolucao_corporal?.observacoes_posturais}
          />
        </Bloco>

        {r.pontos_de_atencao?.length ? (
          <Bloco titulo="Pontos de atenção">
            <ul className="ml-4 list-disc space-y-1">
              {r.pontos_de_atencao.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </Bloco>
        ) : null}

        {r.sugestoes_para_proximas_sessoes?.length ? (
          <Bloco titulo="Sugestões para as próximas aulas">
            <ul className="ml-4 list-disc space-y-1">
              {r.sugestoes_para_proximas_sessoes.map((t) => (
                <li key={t}>{t}</li>
              ))}
            </ul>
          </Bloco>
        ) : null}

        <p className="mt-6 rounded-md bg-slate-50 px-3 py-2 text-[11px] leading-relaxed text-slate-500">
          {AVISO_IA}
        </p>

        <footer className="mt-4 border-t border-slate-200 pt-3 text-center text-[11px] text-slate-400">
          {tenant.name ?? "FisioPilates"} · Documento gerado no FisioPilates
        </footer>
      </div>
    </>
  );
}
