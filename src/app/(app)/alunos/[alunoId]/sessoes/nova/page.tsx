import { PlanoAulaCard } from "@/components/sessoes/plano-aula-card";
import { SessaoForm, type UltimaSessao } from "@/components/sessoes/sessao-form";
import { getAppointment } from "@/server/agenda";
import { listExercises } from "@/server/exercises";
import { getPlanoPrefill } from "@/server/session-plans";
import { getLastSession } from "@/server/sessions";

export default async function NovaSessaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ alunoId: string }>;
  searchParams: Promise<{ plano?: string; agendamento?: string }>;
}) {
  const { alunoId } = await params;
  const { plano, agendamento } = await searchParams;

  const [exercises, ultima, planoPrefill, appointment] = await Promise.all([
    listExercises(),
    getLastSession(alunoId),
    plano ? getPlanoPrefill(plano) : Promise.resolve(null),
    agendamento ? getAppointment(agendamento) : Promise.resolve(null),
  ]);

  // Só vincula se o agendamento é mesmo deste aluno.
  const appt = appointment && appointment.student_id === alunoId ? appointment : null;

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
    <div className="w-full p-4 md:p-6">
      <div
        className={
          planoPrefill
            ? "grid grid-cols-1 items-start gap-5 lg:grid-cols-2"
            : "mx-auto w-full max-w-2xl"
        }
      >
        {planoPrefill ? (
          <PlanoAulaCard plano={planoPrefill.plano} naoEncontrados={planoPrefill.naoEncontrados} />
        ) : null}

        <div>
          <h1 className="mb-1 font-heading text-lg font-semibold">Registrar aula</h1>
          {planoPrefill ? (
            <p className="mb-4 text-sm text-muted-foreground">
              O plano da IA já preencheu os campos abaixo — revise e ajuste antes de salvar.
            </p>
          ) : null}
          <SessaoForm
            studentId={alunoId}
            exercises={exercises}
            ultimaSessao={ultimaSessao}
            prefill={planoPrefill?.prefill ?? null}
            appointmentId={appt?.id ?? null}
            defaultDate={appt?.appointment_date ?? null}
          />
        </div>
      </div>
    </div>
  );
}
