import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/server/auth";

/**
 * Helpers de leitura para o painel admin. Tudo via service_role quando
 * precisa cruzar tenants (defesa em profundidade: a RLS de admin_users
 * só permite SELECT do próprio id; tudo que é leitura de outros tenants
 * passa por aqui, com `requireAdmin` no topo).
 */

export type TenantListRow = {
  id: string;
  name: string;
  plan: string;
  status: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  current_period_end: string | null;
  trial_ends_at: string | null;
  ai_monthly_limit_usd: number;
  created_at: string;
  owner_email: string;
  owner_name: string;
  total_alunas: number;
  total_sessoes: number;
};

export async function listarTenants(opts: {
  busca?: string;
  status?: string;
  plan?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ rows: TenantListRow[]; total: number }> {
  await requireAdmin();
  const admin = createAdminClient();
  const page = Math.max(0, opts.page ?? 0);
  const pageSize = Math.min(100, Math.max(1, opts.pageSize ?? 20));
  const from = page * pageSize;
  const to = from + pageSize - 1;

  let q = admin
    .from("tenants")
    .select(
      "id, name, plan, status, stripe_customer_id, stripe_subscription_id, current_period_end, trial_ends_at, ai_monthly_limit_usd, created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(from, to);
  if (opts.status) q = q.eq("status", opts.status);
  if (opts.plan) q = q.eq("plan", opts.plan);

  const { data, count } = await q;
  let rows = (data ?? []) as TenantListRow[];

  if (opts.busca) {
    const lower = opts.busca.toLowerCase();
    rows = rows.filter(
      (r) => r.name.toLowerCase().includes(lower) || r.id.toLowerCase().includes(lower),
    );
  }

  // Enriquece com email/nome do owner + contagens.
  const ids = rows.map((r) => r.id);
  if (ids.length) {
    const [members, students, sessions, profiles] = await Promise.all([
      admin
        .from("tenant_members")
        .select("tenant_id, user_id")
        .in("tenant_id", ids)
        .eq("role", "owner"),
      admin
        .from("students")
        .select("tenant_id", { count: "exact", head: true })
        .in("tenant_id", ids)
        .is("deleted_at", null),
      admin
        .from("sessions")
        .select("tenant_id", { count: "exact", head: true })
        .in("tenant_id", ids)
        .is("deleted_at", null),
      admin
        .from("profiles")
        .select("id, full_name, email")
        .in(
          "id",
          [] as string[], // preenchido abaixo
        ),
    ]);
    const memberByTenant = new Map<string, string>();
    for (const m of members.data ?? []) memberByTenant.set(m.tenant_id, m.user_id);
    const profileById = new Map<string, { full_name: string; email: string }>();
    for (const p of profiles.data ?? []) {
      profileById.set(p.id, { full_name: p.full_name ?? "", email: p.email ?? "" });
    }
    // count acima só conta primeira página; para a listagem atual, isso basta
    // porque estamos enriquecendo a página visível.
    const studentsByTenant = new Map<string, number>();
    const sessionsByTenant = new Map<string, number>();
    for (const s of students.data ?? []) {
      const t = (s as { tenant_id: string }).tenant_id;
      studentsByTenant.set(t, (studentsByTenant.get(t) ?? 0) + 1);
    }
    for (const s of sessions.data ?? []) {
      const t = (s as { tenant_id: string }).tenant_id;
      sessionsByTenant.set(t, (sessionsByTenant.get(t) ?? 0) + 1);
    }
    // Para profiles: segunda query só pelos user_ids únicos.
    const userIds = [...new Set(memberByTenant.values())];
    if (userIds.length) {
      const { data: profs } = await admin
        .from("profiles")
        .select("id, full_name, email")
        .in("id", userIds);
      for (const p of profs ?? []) {
        profileById.set(p.id, { full_name: p.full_name ?? "", email: p.email ?? "" });
      }
    }
    for (const r of rows) {
      const userId = memberByTenant.get(r.id);
      const prof = userId ? profileById.get(userId) : null;
      r.owner_email = prof?.email ?? "—";
      r.owner_name = prof?.full_name ?? "—";
      r.total_alunas = studentsByTenant.get(r.id) ?? 0;
      r.total_sessoes = sessionsByTenant.get(r.id) ?? 0;
    }
  }

  return { rows, total: count ?? rows.length };
}

export async function obterTenantDetalhe(tenantId: string) {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: tenant } = await admin.from("tenants").select("*").eq("id", tenantId).single();
  if (!tenant) return null;

  const [{ data: subscription }, { data: invoices }, { data: members }] = await Promise.all([
    admin.from("subscriptions").select("*").eq("tenant_id", tenantId).maybeSingle(),
    admin
      .from("invoices")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(20),
    admin.from("tenant_members").select("user_id, role").eq("tenant_id", tenantId),
  ]);

  const userIds = (members ?? []).map((m) => m.user_id);
  const { data: profiles } = userIds.length
    ? await admin.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] };

  return {
    tenant,
    subscription,
    invoices: invoices ?? [],
    members: members ?? [],
    profiles: profiles ?? [],
  };
}

export const kpi = cache(async () => {
  await requireAdmin();
  const admin = createAdminClient();
  const inicioDoMes = new Date();
  inicioDoMes.setDate(1);
  inicioDoMes.setHours(0, 0, 0, 0);
  const inicioMesISO = inicioDoMes.toISOString();

  const [
    { data: tenants },
    { data: subscriptions },
    { data: invoicesMes },
    { data: usageMes },
    { data: novos },
    { data: cancelados },
  ] = await Promise.all([
    admin.from("tenants").select("id, plan, status"),
    admin.from("subscriptions").select("id, status, plan, current_period_end"),
    admin
      .from("invoices")
      .select("amount_cents, status, created_at")
      .eq("status", "paid")
      .gte("created_at", inicioMesISO),
    admin
      .from("ai_usage_log")
      .select("tenant_id, cost_usd, kind, model")
      .gte("created_at", inicioMesISO),
    admin.from("tenants").select("id").gte("created_at", inicioMesISO),
    admin
      .from("subscriptions")
      .select("id")
      .eq("status", "canceled")
      .gte("canceled_at", inicioMesISO),
  ]);

  // MRR (estimado): soma de preco_mensal por assinatura ativa.
  let mrrCents = 0;
  for (const s of subscriptions ?? []) {
    if (s.status === "active" || s.status === "trialing") {
      const cents = precoCents(s.plan);
      mrrCents += cents;
    }
  }
  const faturasMesCents = (invoicesMes ?? []).reduce((s, i) => s + (i.amount_cents ?? 0), 0);
  const custoIa = (usageMes ?? []).reduce(
    (s, u) => s + (typeof u.cost_usd === "number" ? u.cost_usd : 0),
    0,
  );
  const topConsumidores = aggregateTopConsumidores(usageMes ?? []);
  const relatoriosMes = (usageMes ?? []).filter((u) => u.kind === "report").length;

  return {
    mrrCents,
    mrrFormatado: formatBRL(mrrCents),
    faturasMesCents: formatBRL(faturasMesCents),
    tenantsAtivos: (tenants ?? []).filter((t) => t.status !== "deleted").length,
    novosEsteMes: (novos ?? []).length,
    canceladosEsteMes: (cancelados ?? []).length,
    custoIa: custoIa,
    custoIaFormatado: `US$ ${custoIa.toFixed(2)}`,
    relatoriosMes,
    topConsumidores,
    porModelo: aggregatePorModelo(usageMes ?? []),
  };
});

function precoCents(plan: string | null | undefined): number {
  switch (plan) {
    case "essencial":
      return 4990;
    case "profissional":
      return 9990;
    case "clinica":
      return 19990;
    case "payg":
      return 0;
    default:
      return 0;
  }
}

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function aggregateTopConsumidores(rows: { tenant_id: string; cost_usd: number | null }[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const v = typeof r.cost_usd === "number" ? r.cost_usd : 0;
    map.set(r.tenant_id, (map.get(r.tenant_id) ?? 0) + v);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([tenantId, custo]) => ({ tenantId, custo }));
}

function aggregatePorModelo(rows: { model: string | null; cost_usd: number | null }[]) {
  const map = new Map<string, number>();
  for (const r of rows) {
    const m = r.model ?? "desconhecido";
    const v = typeof r.cost_usd === "number" ? r.cost_usd : 0;
    map.set(m, (map.get(m) ?? 0) + v);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([modelo, custo]) => ({ modelo, custo }));
}

export async function listarAssinaturas(opts: { status?: string; page?: number }) {
  await requireAdmin();
  const admin = createAdminClient();
  const page = Math.max(0, opts.page ?? 0);
  const pageSize = 30;
  let q = admin
    .from("subscriptions")
    .select("*, tenants(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);
  if (opts.status) q = q.eq("status", opts.status);
  const { data, count } = await q;
  return { rows: data ?? [], total: count ?? 0 };
}

export async function listarFaturas(opts: { status?: string; page?: number }) {
  await requireAdmin();
  const admin = createAdminClient();
  const page = Math.max(0, opts.page ?? 0);
  const pageSize = 30;
  let q = admin
    .from("invoices")
    .select("*, tenants(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);
  if (opts.status) q = q.eq("status", opts.status);
  const { data, count } = await q;
  return { rows: data ?? [], total: count ?? 0 };
}

export async function listarUsoIa(opts: { page?: number }) {
  await requireAdmin();
  const admin = createAdminClient();
  const page = Math.max(0, opts.page ?? 0);
  const pageSize = 30;
  const { data, count } = await admin
    .from("ai_usage_log")
    .select("*, tenants(name)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);
  return { rows: data ?? [], total: count ?? 0 };
}

export async function listarAuditLog(opts: { page?: number; acao?: string; tenantId?: string }) {
  await requireAdmin();
  const admin = createAdminClient();
  const page = Math.max(0, opts.page ?? 0);
  const pageSize = 50;
  // Join com profiles via user_id (sem FK declarada) — feito manualmente.
  const { data: rows, count } = await admin
    .from("audit_logs")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(page * pageSize, (page + 1) * pageSize - 1);
  const userIds = Array.from(
    new Set((rows ?? []).map((r) => r.user_id).filter((u): u is string => !!u)),
  );
  const { data: profiles } = userIds.length
    ? await admin.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] };
  const map = new Map((profiles ?? []).map((p) => [p.id, p]));
  const enriched = (rows ?? []).map((r) => ({
    ...r,
    profile: r.user_id ? (map.get(r.user_id) ?? null) : null,
  }));
  let filtered = enriched;
  if (opts.acao) filtered = filtered.filter((r) => r.action === opts.acao);
  if (opts.tenantId) filtered = filtered.filter((r) => r.tenant_id === opts.tenantId);
  return { rows: filtered, total: count ?? 0 };
}

export async function listarKbGlobal() {
  await requireAdmin();
  const admin = createAdminClient();
  const { data } = await admin
    .from("kb_documents")
    .select("id, title, author, status, total_pages, processed_pages, chunk_count, created_at")
    .eq("scope", "global")
    .order("created_at", { ascending: false });
  return data ?? [];
}

export async function listarAdmins() {
  await requireAdmin();
  const admin = createAdminClient();
  const { data: rows } = await admin
    .from("admin_users")
    .select("id, role, created_at")
    .order("created_at", { ascending: false });
  const userIds = (rows ?? []).map((r) => r.id);
  const { data: profiles } = userIds.length
    ? await admin.from("profiles").select("id, full_name, email").in("id", userIds)
    : { data: [] };
  const map = new Map((profiles ?? []).map((p) => [p.id, p]));
  return (rows ?? []).map((r) => ({ ...r, profile: map.get(r.id) ?? null }));
}

export async function getAdminContextOrNull(): Promise<{
  user: { id: string };
  role: "super_admin" | "support" | "finance";
} | null> {
  const { getAdminContext } = await import("@/server/auth");
  return await getAdminContext();
}

// Re-export para uso nos server actions.
export { createClient };
