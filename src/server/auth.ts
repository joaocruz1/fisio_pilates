import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];
type Tenant = Database["public"]["Tables"]["tenants"]["Row"];

/**
 * Helpers de sessão/tenant para Server Components e Server Actions.
 * `cache()` deduplica as queries dentro de um mesmo render/request.
 * A segurança real é a RLS no banco; estes helpers são conveniência + UX.
 */

export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

export type TenantContext = {
  user: NonNullable<Awaited<ReturnType<typeof getUser>>>;
  profile: Profile;
  tenant: Tenant;
  role: string;
};

/** Resolve usuária + perfil + tenant (via tenant_members). null se algo faltar. */
export const getTenantContext = cache(async (): Promise<TenantContext | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: member } = await supabase
    .from("tenant_members")
    .select("tenant_id, role")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!member) return null;

  const [{ data: profile }, { data: tenant }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("tenants").select("*").eq("id", member.tenant_id).single(),
  ]);
  if (!profile || !tenant) return null;

  return { user, profile, tenant, role: member.role };
});

/** Área logada: exige onboarding concluído. Redireciona caso contrário. */
export async function requireTenant(): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  if (!ctx.profile.onboarding_completed_at) redirect("/onboarding");
  return ctx;
}

/** Tela de onboarding: exige usuária logada, mas ainda SEM onboarding concluído. */
export async function requireOnboarding(): Promise<TenantContext> {
  const ctx = await getTenantContext();
  if (!ctx) redirect("/login");
  if (ctx.profile.onboarding_completed_at) redirect("/dashboard");
  return ctx;
}

// ----------------------------------------------------------------------------
// Admin helpers (B12, B13)
// ----------------------------------------------------------------------------

export type AdminRole = "super_admin" | "support" | "finance";

export type AdminContext = {
  user: NonNullable<Awaited<ReturnType<typeof getUser>>>;
  role: AdminRole;
};

/** Lê o registro de admin_users do auth.uid() (RLS permite ver o próprio). */
export const getAdminContext = cache(async (): Promise<AdminContext | null> => {
  const user = await getUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase
    .from("admin_users")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (!data) return null;
  return { user, role: data.role as AdminRole };
});

/** Áreas admin: exige usuária em admin_users. Redireciona se não for admin. */
export async function requireAdmin(): Promise<AdminContext> {
  const ctx = await getAdminContext();
  if (!ctx) redirect("/dashboard"); // não-admin cai fora do /admin
  return ctx;
}

/** Versão que aceita uma role específica (ex: super_admin para /admin/admins). */
export async function requireAdminRole(role: AdminRole): Promise<AdminContext> {
  const ctx = await requireAdmin();
  if (ctx.role !== role && ctx.role !== "super_admin") {
    redirect("/admin"); // sem permissão
  }
  return ctx;
}
