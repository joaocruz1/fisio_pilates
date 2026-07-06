import { MedidasSection } from "@/components/evolucao/medidas-section";
import { listMeasurements } from "@/server/measurements";

export default async function EvolucaoPage({ params }: { params: Promise<{ alunoId: string }> }) {
  const { alunoId } = await params;
  const medidas = await listMeasurements(alunoId);

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <MedidasSection studentId={alunoId} medidas={medidas} />
      <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
        Gráficos de evolução (dor, frequência, carga e medidas) e os relatórios com IA chegam nas
        próximas fases.
      </p>
    </div>
  );
}
