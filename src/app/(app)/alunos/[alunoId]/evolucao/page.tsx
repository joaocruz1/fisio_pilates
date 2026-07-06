import { GraficosEvolucao } from "@/components/evolucao/graficos-evolucao";
import { MedidasSection } from "@/components/evolucao/medidas-section";
import { RelatoriosIA } from "@/components/evolucao/relatorios-ia";
import { Separator } from "@/components/ui/separator";
import { listMeasurements } from "@/server/measurements";
import { listReports } from "@/server/reports";
import { listSessions } from "@/server/sessions";

const curto = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export default async function EvolucaoPage({ params }: { params: Promise<{ alunoId: string }> }) {
  const { alunoId } = await params;
  const [sessoes, medidas, reports] = await Promise.all([
    listSessions(alunoId),
    listMeasurements(alunoId),
    listReports(alunoId),
  ]);

  const sessoesAsc = [...sessoes].reverse();
  const dor = sessoesAsc
    .filter((s) => s.pain_level_post != null)
    .map((s) => ({ data: curto(s.session_date), dor: s.pain_level_post as number }));

  const medidasAsc = [...medidas].reverse();
  const peso = medidasAsc
    .filter((m) => m.weight_kg != null)
    .map((m) => ({ data: curto(m.measured_at), peso: m.weight_kg as number }));

  const freqMap = new Map<string, number>();
  for (const s of sessoesAsc) {
    const mes = `${s.session_date.slice(5, 7)}/${s.session_date.slice(2, 4)}`;
    freqMap.set(mes, (freqMap.get(mes) ?? 0) + 1);
  }
  const frequencia = [...freqMap.entries()].map(([mes, sessoes]) => ({ mes, sessoes }));

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <GraficosEvolucao dor={dor} peso={peso} frequencia={frequencia} />
      <Separator />
      <RelatoriosIA studentId={alunoId} reports={reports} />
      <Separator />
      <MedidasSection studentId={alunoId} medidas={medidas} />
    </div>
  );
}
