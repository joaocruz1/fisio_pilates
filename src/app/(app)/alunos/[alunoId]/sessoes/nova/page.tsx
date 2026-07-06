import { SessaoForm, type UltimaSessao } from "@/components/sessoes/sessao-form";
import { listExercises } from "@/server/exercises";
import { getLastSession } from "@/server/sessions";

export default async function NovaSessaoPage({ params }: { params: Promise<{ alunoId: string }> }) {
  const { alunoId } = await params;
  const [exercises, ultima] = await Promise.all([listExercises(), getLastSession(alunoId)]);

  const ultimaSessao: UltimaSessao | null = ultima
    ? {
        focus: ultima.focus,
        exercises: ultima.exercises.map((e) => ({
          exerciseId: e.exercise_id,
          sets: e.sets,
          reps: e.reps,
          loadSprings: e.load_springs,
          resistanceLevel: e.resistance_level,
        })),
      }
    : null;

  return (
    <div className="mx-auto w-full max-w-2xl p-4 md:p-6">
      <h1 className="mb-4 text-lg font-semibold">Registrar sessão</h1>
      <SessaoForm studentId={alunoId} exercises={exercises} ultimaSessao={ultimaSessao} />
    </div>
  );
}
