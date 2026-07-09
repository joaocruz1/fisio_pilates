import { beforeEach, describe, expect, it, vi } from "vitest";

const mockPrefs = vi.hoisted(() => ({
  row: null as null | { chat_model: string; report_model: string; vision_model: string },
}));

vi.mock("@/lib/env", () => ({
  env: () => ({
    OPENROUTER_API_KEY: "test",
    OPENROUTER_MODEL: "anthropic/claude-sonnet-5",
    OPENROUTER_MODEL_FALLBACK: "anthropic/claude-sonnet-4.6",
    OPENROUTER_MODEL_CHEAP: "anthropic/claude-haiku-4.5",
    STRIPE_SECRET_KEY: "sk_test",
    STRIPE_WEBHOOK_SECRET: "whsec_test",
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: "pk_test",
  }),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: (table: string) => {
      if (table !== "user_ai_preferences") return makeBuilder(null);
      return makeBuilder(mockPrefs.row);
    },
  }),
}));

type Builder = {
  select: (...args: unknown[]) => Builder;
  eq: (col: string, val: unknown) => Builder;
  maybeSingle: () => Promise<{ data: unknown; error: null }>;
};

function makeBuilder(row: unknown): Builder {
  return {
    select: () => makeBuilder(row),
    eq: () => makeBuilder(row),
    maybeSingle: async () => ({ data: row, error: null }),
  };
}

describe("preferencias — getPreferenciasIA", () => {
  beforeEach(() => {
    mockPrefs.row = null;
  });

  it("sem linha → defaults do sistema", async () => {
    const { getPreferenciasIA } = await import("@/lib/ai/preferencias");
    const p = await getPreferenciasIA("u1");
    expect(p.chat).toBe("balanceado");
    expect(p.report).toBe("alta_precisao");
    expect(p.vision).toBe("alta_precisao");
  });

  it("com linha → retorna valores salvos", async () => {
    mockPrefs.row = {
      chat_model: "economico",
      report_model: "balanceado",
      vision_model: "alta_precisao",
    };
    const { getPreferenciasIA } = await import("@/lib/ai/preferencias");
    const p = await getPreferenciasIA("u1");
    expect(p.chat).toBe("economico");
    expect(p.report).toBe("balanceado");
    expect(p.vision).toBe("alta_precisao");
  });
});

describe("preferencias — getModeloParaFeature", () => {
  beforeEach(() => {
    mockPrefs.row = null;
  });

  it("chat sem preferência → Haiku (balanceado)", async () => {
    const { getModeloParaFeature } = await import("@/lib/ai/preferencias");
    expect(await getModeloParaFeature("u1", "chat")).toBe("anthropic/claude-haiku-4.5");
  });

  it("relatorio sem preferência → Sonnet 5 (alta precisão)", async () => {
    const { getModeloParaFeature } = await import("@/lib/ai/preferencias");
    expect(await getModeloParaFeature("u1", "relatorio")).toBe("anthropic/claude-sonnet-5");
  });

  it("vision sem preferência → Sonnet 5 (alta precisão)", async () => {
    const { getModeloParaFeature } = await import("@/lib/ai/preferencias");
    expect(await getModeloParaFeature("u1", "vision")).toBe("anthropic/claude-sonnet-5");
  });

  it("vision + economico → Gemini Flash (caso especial)", async () => {
    mockPrefs.row = {
      chat_model: "economico",
      report_model: "alta_precisao",
      vision_model: "economico",
    };
    const { getModeloParaFeature } = await import("@/lib/ai/preferencias");
    expect(await getModeloParaFeature("u1", "vision")).toBe("google/gemini-2.5-flash");
  });

  it("vision + balanceado → fallback Sonnet (não há tier intermediário)", async () => {
    mockPrefs.row = {
      chat_model: "balanceado",
      report_model: "balanceado",
      vision_model: "balanceado",
    };
    const { getModeloParaFeature } = await import("@/lib/ai/preferencias");
    // Suporta retorna false → cai pra alta precisão
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const slug = await getModeloParaFeature("u1", "vision");
    expect(slug).toBe("anthropic/claude-sonnet-5");
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
