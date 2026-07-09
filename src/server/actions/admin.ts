"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ActionResult } from "@/server/actions/result";
import { requireAdmin, requireAdminRole } from "@/server/auth";

/**
 * Server actions do painel admin (B14).
 * Cada ação grava `audit_logs` com `actor_user_id = admin.id`. Use
 * `createAdminClient` (service_role) para mutações cross-tenant.
 */

async function audit(
  actorId: string,
  tenantId: string | null,
  action: string,
  metadata: Record<string, unknown> = {},
) {
  const admin = createAdminClient();
  await admin.from("audit_logs").insert({
    tenant_id: tenantId,
    user_id: actorId,
    action,
    entity_type: tenantId ? "tenant" : "admin",
    entity_id: tenantId ?? actorId,
    metadata: metadata as never,
  });
}

// ----------------------------------------------------------------------------
// Tenant
// ----------------------------------------------------------------------------

export async function suspenderTenant(opts: {
  tenantId: string;
  motivo: string;
}): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("tenants")
    .update({ status: "suspended" })
    .eq("id", opts.tenantId);
  if (error) return { ok: false, erro: "Falha ao suspender tenant." };
  await audit(ctx.user.id, opts.tenantId, "admin.tenant.suspend", { motivo: opts.motivo });
  revalidatePath("/admin/tenants");
  return { ok: true, data: null };
}

export async function reativarTenant(opts: { tenantId: string }): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("tenants")
    .update({ status: "active" })
    .eq("id", opts.tenantId);
  if (error) return { ok: false, erro: "Falha ao reativar tenant." };
  await audit(ctx.user.id, opts.tenantId, "admin.tenant.reactivate");
  revalidatePath("/admin/tenants");
  return { ok: true, data: null };
}

export async function ajustarCotaIA(opts: {
  tenantId: string;
  limite: number;
}): Promise<ActionResult> {
  const ctx = await requireAdmin();
  const admin = createAdminClient();
  const { error } = await admin
    .from("tenants")
    .update({ ai_monthly_limit_usd: opts.limite })
    .eq("id", opts.tenantId);
  if (error) return { ok: false, erro: "Falha ao ajustar cota." };
  await audit(ctx.user.id, opts.tenantId, "admin.tenant.ajustar_cota", { limite: opts.limite });
  revalidatePath("/admin/tenants");
  return { ok: true, data: null };
}

// ----------------------------------------------------------------------------
// Admins
// ----------------------------------------------------------------------------

export async function criarAdmin(opts: {
  email: string;
  role: "super_admin" | "support" | "finance";
  notes?: string;
}): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireAdminRole("super_admin");
  const admin = createAdminClient();
  // Encontra o user_id pelo email.
  const { data: users, error: listErr } = await admin.auth.admin.listUsers({ perPage: 200 });
  if (listErr) return { ok: false, erro: "Não foi possível listar usuários." };
  const user = users.users.find((u) => u.email === opts.email);
  if (!user)
    return { ok: false, erro: "Usuário não encontrado. Crie a conta pelo /cadastro primeiro." };
  const { data, error } = await admin
    .from("admin_users")
    .insert({ id: user.id, role: opts.role })
    .select("id")
    .single();
  if (error) return { ok: false, erro: `Falha ao criar admin: ${error.message}` };
  await audit(ctx.user.id, null, "admin.admin.create", { novoAdminId: data.id, role: opts.role });
  revalidatePath("/admin/admins");
  return { ok: true, data: { id: data.id } };
}

export async function revogarAdmin(opts: { adminId: string }): Promise<ActionResult> {
  const ctx = await requireAdminRole("super_admin");
  if (opts.adminId === ctx.user.id) {
    return { ok: false, erro: "Você não pode revogar seu próprio acesso." };
  }
  const admin = createAdminClient();
  const { error } = await admin.from("admin_users").delete().eq("id", opts.adminId);
  if (error) return { ok: false, erro: "Falha ao revogar admin." };
  await audit(ctx.user.id, null, "admin.admin.revoke", { adminRevogadoId: opts.adminId });
  revalidatePath("/admin/admins");
  return { ok: true, data: null };
}
