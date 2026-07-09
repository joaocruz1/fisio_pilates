import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock do Stripe SDK e dos clientes Supabase antes de importar o módulo.
const mockStripe = {
  webhooks: {
    constructEvent: vi.fn(),
  },
  customers: {
    create: vi.fn(),
  },
  checkout: {
    sessions: {
      create: vi.fn(),
    },
  },
  billingPortal: {
    sessions: {
      create: vi.fn(),
    },
  },
  subscriptions: {
    retrieve: vi.fn(),
    update: vi.fn(),
  },
  subscriptionItems: {
    createUsageRecord: vi.fn(),
  },
};

vi.mock("@/lib/stripe/client", () => ({
  getStripe: () => mockStripe,
}));

const stripeEventsRows: { id: string; error: string | null }[] = [];
const tenantsRows: { id: string; plan: string }[] = [];
const subscriptionsRows: { stripe_subscription_id: string; status: string }[] = [];
const invoicesRows: { stripe_invoice_id: string; status: string }[] = [];

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "stripe_events") {
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              maybeSingle: async () => {
                const found = stripeEventsRows.find((r) => r.id === val);
                return { data: found ?? null, error: null };
              },
            }),
          }),
          insert: async (row: { id: string; type: string; payload: unknown; error?: string }) => {
            stripeEventsRows.push({ id: row.id, error: row.error ?? null });
            return { data: row, error: null };
          },
        };
      }
      if (table === "tenants") {
        return {
          select: () => ({
            eq: (_col: string, val: string) => ({
              single: async () => {
                const found = tenantsRows.find((r) => r.id === val);
                return { data: found ?? null, error: null };
              },
              maybeSingle: async () => {
                const found = tenantsRows.find((r) => r.id === val);
                return { data: found ?? null, error: null };
              },
            }),
          }),
          update: (update: { plan?: string; status?: string }) => ({
            eq: async (_col: string, val: string) => {
              const t = tenantsRows.find((r) => r.id === val);
              if (t) Object.assign(t, update);
              return { data: t, error: null };
            },
          }),
        };
      }
      if (table === "subscriptions") {
        return {
          upsert: async (row: { stripe_subscription_id: string; status: string }) => {
            const existing = subscriptionsRows.find(
              (r) => r.stripe_subscription_id === row.stripe_subscription_id,
            );
            if (existing) {
              Object.assign(existing, row);
            } else {
              subscriptionsRows.push(row);
            }
            return { data: row, error: null };
          },
          update: (update: { status: string }) => ({
            eq: async (_col: string, val: string) => {
              const s = subscriptionsRows.find((r) => r.stripe_subscription_id === val);
              if (s) Object.assign(s, update);
              return { data: s, error: null };
            },
          }),
        };
      }
      if (table === "invoices") {
        return {
          upsert: async (row: { stripe_invoice_id: string; status: string }) => {
            const existing = invoicesRows.find(
              (r) => r.stripe_invoice_id === row.stripe_invoice_id,
            );
            if (existing) {
              Object.assign(existing, row);
            } else {
              invoicesRows.push(row);
            }
            return { data: row, error: null };
          },
        };
      }
      return {};
    },
  }),
}));

vi.mock("@/lib/env", () => ({
  env: () => ({
    STRIPE_WEBHOOK_SECRET: "whsec_test",
    STRIPE_SECRET_KEY: "sk_test",
    APP_URL: "http://localhost:3000",
  }),
}));

describe("webhook — processarEvento", () => {
  beforeEach(() => {
    stripeEventsRows.length = 0;
    tenantsRows.length = 0;
    subscriptionsRows.length = 0;
    invoicesRows.length = 0;
  });

  it("deduplica evento já processado", async () => {
    stripeEventsRows.push({ id: "evt_1", error: null });
    const { processarEvento } = await import("@/lib/billing/webhook");
    const r = await processarEvento({
      id: "evt_1",
      type: "invoice.paid",
    } as never);
    expect(r).toEqual({ ok: true, deduped: true });
  });

  it("ignora evento de tenant vitalicio (B7)", async () => {
    tenantsRows.push({ id: "t1", plan: "vitalicio" });
    const { processarEvento } = await import("@/lib/billing/webhook");
    const r = await processarEvento({
      id: "evt_v1",
      type: "invoice.paid",
      data: {
        object: {
          id: "in_v1",
          amount_paid: 100,
          customer_metadata: { tenant_id: "t1" },
        },
      },
    } as never);
    expect(r.ok).toBe(true);
    // Nenhuma invoice criada (foi ignorada por vitalicioGuard).
    expect(invoicesRows.length).toBe(0);
  });

  it("registra evento processado no stripe_events", async () => {
    tenantsRows.push({ id: "t1", plan: "essencial" });
    const { processarEvento } = await import("@/lib/billing/webhook");
    const r = await processarEvento({
      id: "evt_2",
      type: "invoice.paid",
      data: {
        object: {
          id: "in_2",
          amount_paid: 4900,
          currency: "brl",
          customer_metadata: { tenant_id: "t1" },
        },
      },
    } as never);
    expect(r.ok).toBe(true);
    expect(r.deduped).toBe(false);
    expect(stripeEventsRows.length).toBe(1);
    expect(stripeEventsRows[0].id).toBe("evt_2");
    expect(invoicesRows.length).toBe(1);
  });
});

describe("verificarAssinatura", () => {
  it("delegates to stripe.webhooks.constructEvent", async () => {
    mockStripe.webhooks.constructEvent.mockReturnValue({ id: "evt_3", type: "invoice.paid" });
    const { verificarAssinatura } = await import("@/lib/billing/webhook");
    const ev = verificarAssinatura("{}", "sig");
    expect(ev.id).toBe("evt_3");
    expect(mockStripe.webhooks.constructEvent).toHaveBeenCalledWith("{}", "sig", "whsec_test");
  });
});
