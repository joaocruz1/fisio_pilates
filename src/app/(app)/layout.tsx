import { AppShell } from "@/components/layout/app-shell";
import { requireTenant } from "@/server/auth";
import { listStudents } from "@/server/students";

/**
 * Shell da área logada. `requireTenant()` valida a sessão contra o Auth
 * (getUser) e redireciona: sem sessão → /login; sem onboarding → /onboarding.
 * A segurança de dados é a RLS por tenant no banco.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireTenant();
  // Um aluno de exemplo para o tour entrar na ficha (Avaliação/Aulas/Evolução).
  const alunos = await listStudents();
  const primeiroAlunoId = alunos[0]?.id ?? null;
  return (
    <AppShell
      userName={profile.full_name}
      tourPending={!profile.tour_completed_at}
      primeiroAlunoId={primeiroAlunoId}
    >
      {children}
    </AppShell>
  );
}
