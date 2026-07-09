import { beforeEach, describe, expect, it, vi } from "vitest";

// Mocks estáticos — precisam estar no escopo do módulo.
const mockState = vi.hoisted(() => ({
  plan: { plan: "free", status: "active" },
  counts: { alunos: 0, chat: 0, relatorios: 0, vision: 0 },
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table === "students") return makeBuilder([], mockState.counts.alunos);
      return makeBuilder([], null);
    },
  }),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "tenants") return makeBuilder([mockState.plan], null);
      if (table === "ai_usage_log") {
        // encadeia: .select().eq().eq().gte() — qualquer eq sem gte depois
        // retorna o mesmo builder (semelhante ao Postgrest).
        return {
          select: () => chainEqBuilder(0),
        };
      }
      return makeBuilder([], 0);
    },
  }),
}));

function chainEqBuilder(accumulatedCount: number): ThenableBuilder {
  const b: ThenableBuilder = makeBuilder([], null);
  // Substitui o select/eq para acumular um "count" final.
  const inner: ThenableBuilder = {
    ...b,
    select: () => chainEqBuilder(accumulatedCount),
    eq: (_col: string, val: unknown) => {
      // segundo eq (tenant_id + kind) define o count por kind
      if (val === "chat") return chainEqBuilder(mockState.counts.chat);
      if (val === "report") return chainEqBuilder(mockState.counts.relatorios);
      if (val === "vision") return chainEqBuilder(mockState.counts.vision);
      return chainEqBuilder(accumulatedCount);
    },
    gte: () => makeBuilder([], accumulatedCount),
  };
  return inner;
}

// `server-only` lança erro se importado fora de RSC. No Vitest, tratamos como no-op.
vi.mock("server-only", () => ({}));

type FakeBuilder = {
  select: (...args: unknown[]) => FakeBuilder;
  eq: (col: string, val: unknown) => FakeBuilder;
  is: (col: string, val: unknown) => FakeBuilder;
  gte: (col: string, val: string) => FakeBuilder;
  in: (col: string, vals: unknown[]) => FakeBuilder;
  single: () => Promise<{ data: unknown; error: null }>;
  maybeSingle: () => Promise<{ data: unknown; error: null }>;
};

// biome-ignore lint/suspicious/noThenProperty: simulando Postgrest builder
type ThenableBuilder = FakeBuilder & {
  then: <T>(resolve: (v: { data: unknown[]; count: number | null; error: null }) => T) => Promise<T>;
};

function makeBuilder(rows: unknown[], count: number | null): ThenableBuilder {
  const b: ThenableBuilder = {
    select: () => b,
    eq: () => b,
    is: () => b,
    gte: () => b,
    in: () => b,
    single: async () => ({ data: rows[0] ?? null, error: null }),
    maybeSingle: async () => ({ data: rows[0] ?? null, error: null }),
    then: (resolve) => Promise.resolve({ data: rows, count, error: null }).then(resolve),
  };
  return b;
}

describe("limites — asserts por plano", () => {
  beforeEach(() => {
    mockState.plan = { plan: "free", status: "active" };
    mockState.counts = { alunos: 0, chat: 0, relatorios: 0, vision: 0 };
  });

  it("vitalício nunca bloqueia", async () => {
    mockState.plan = { plan: "vitalicio", status: "active" };
    mockState.counts = { alunos: 9999, chat: 9999, relatorios: 9999, vision: 9999 };
    const lim = await import("@/lib/billing/limites");
    await expect(lim.assertLimiteAlunos("t1")).resolves.toBeUndefined();
    await expect(lim.assertLimiteChat("t1")).resolves.toBeUndefined();
    await expect(lim.assertLimiteRelatorio("t1")).resolves.toBeUndefined();
    await expect(lim.assertLimiteVision("t1")).resolves.toBeUndefined();
  });

  it("free bloqueia ao atingir limiteAlunos=3", async () => {
    mockState.counts.alunos = 3;
    const lim = await import("@/lib/billing/limites");
    await expect(lim.assertLimiteAlunos("t1")).rejects.toThrow(lim.LimiteExcedidoError);
  });

  it("free NÃO bloqueia dentro do limite", async () => {
    mockState.counts.alunos = 2;
    const lim = await import("@/lib/billing/limites");
    await expect(lim.assertLimiteAlunos("t1")).resolves.toBeUndefined();
  });

  it("free vision com limite=0 não bloqueia (regra fica na UI)", async () => {
    const lim = await import("@/lib/billing/limites");
    await expect(lim.assertLimiteVision("t1")).resolves.toBeUndefined();
  });

  it("profissional não bloqueia (ilimitado)", async () => {
    mockState.plan = { plan: "profissional", status: "active" };
    mockState.counts = { alunos: 999, chat: 1999, relatorios: 49, vision: 999 };
    const lim = await import("@/lib/billing/limites");
    await expect(lim.assertLimiteAlunos("t1")).resolves.toBeUndefined();
    await expect(lim.assertLimiteChat("t1")).resolves.toBeUndefined();
    await expect(lim.assertLimiteRelatorio("t1")).resolves.toBeUndefined();
    await expect(lim.assertLimiteVision("t1")).resolves.toBeUndefined();
  });

  it("payg não bloqueia (tudo metered)", async () => {
    mockState.plan = { plan: "payg", status: "active" };
    mockState.counts = { alunos: 999, chat: 999, relatorios: 999, vision: 999 };
    const lim = await import("@/lib/billing/limites");
    await expect(lim.assertLimiteAlunos("t1")).resolves.toBeUndefined();
    await expect(lim.assertLimiteChat("t1")).resolves.toBeUndefined();
    await expect(lim.assertLimiteRelatorio("t1")).resolves.toBeUndefined();
    await expect(lim.assertLimiteVision("t1")).resolves.toBeUndefined();
  });

  it("essencial bloqueia chat ao atingir 500", async () => {
    mockState.plan = { plan: "essencial", status: "active" };
    mockState.counts.chat = 500;
    const lim = await import("@/lib/billing/limites");
    await expect(lim.assertLimiteChat("t1")).rejects.toThrow(lim.LimiteExcedidoError);
  });
});

describe("limites — contagens expostas", () => {
  beforeEach(() => {
    mockState.plan = { plan: "free", status: "active" };
    mockState.counts = { alunos: 1, chat: 2, relatorios: 3, vision: 4 };
  });
  it("contarAlunas / contarChatMes / contarRelatoriosMes / contarVisionMes retornam números", async () => {
    const lim = await import("@/lib/billing/limites");
    expect(typeof (await lim.contarAlunas("t1"))).toBe("number");
    expect(typeof (await lim.contarChatMes("t1"))).toBe("number");
    expect(typeof (await lim.contarRelatoriosMes("t1"))).toBe("number");
    expect(typeof (await lim.contarVisionMes("t1"))).toBe("number");
  });
});

describe("limites — resumoUso", () => {
  beforeEach(() => {
    mockState.plan = { plan: "essencial", status: "active" };
    mockState.counts = { alunos: 5, chat: 100, relatorios: 2, vision: 1 };
  });
  it("retorna plano + contagens", async () => {
    const lim = await import("@/lib/billing/limites");
    const r = await lim.resumoUso("t1");
    expect(r.planId).toBe("essencial");
    expect(r.plano.nome).toBe("Essencial");
    expect(r.alunos).toBe(5);
    expect(r.chat).toBe(100);
    expect(r.relatorios).toBe(2);
    expect(r.vision).toBe(1);
  });
});
