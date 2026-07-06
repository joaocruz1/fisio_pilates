import { AppShell } from "@/components/layout/app-shell";
import { requireTenant } from "@/server/auth";

/**
 * Shell da área logada. `requireTenant()` valida a sessão contra o Auth
 * (getUser) e redireciona: sem sessão → /login; sem onboarding → /onboarding.
 * A segurança de dados é a RLS por tenant no banco.
 */
export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireTenant();
  return <AppShell userName={profile.full_name}>{children}</AppShell>;
}
