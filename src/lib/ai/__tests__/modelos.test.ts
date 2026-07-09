import { describe, expect, it, vi } from "vitest";

// `modelos.ts` importa MODELS de client.ts, que importa de @/lib/env. Em
// testes unitários, neutralizamos a import chain com um mock no client.
// Mapeamos todas as envs que `env()` exige com placeholders válidos.
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

import {
  catalogoParaUi,
  modeloParaFeature,
  nivelPadrao,
  precosDoModelo,
  suportaFeature,
} from "@/lib/ai/modelos";

describe("modelos — nivelPadrao", () => {
  it("chat = balanceado", () => {
    expect(nivelPadrao("chat")).toBe("balanceado");
  });
  it("relatorio = alta_precisao", () => {
    expect(nivelPadrao("relatorio")).toBe("alta_precisao");
  });
  it("vision = alta_precisao", () => {
    expect(nivelPadrao("vision")).toBe("alta_precisao");
  });
});

describe("modelos — modeloParaFeature", () => {
  const ok = (
    n: "economico" | "balanceado" | "alta_precisao",
    f: "chat" | "relatorio" | "vision",
  ) => modeloParaFeature(n, f).slug;

  it("chat + economico = DeepSeek", () => {
    expect(ok("economico", "chat")).toBe("deepseek/deepseek-chat-v3-0324");
  });
  it("chat + balanceado = Haiku", () => {
    expect(ok("balanceado", "chat")).toBe("anthropic/claude-haiku-4.5");
  });
  it("chat + alta_precisao = Sonnet 5", () => {
    expect(ok("alta_precisao", "chat")).toBe("anthropic/claude-sonnet-5");
  });

  it("relatorio + economico = DeepSeek", () => {
    expect(ok("economico", "relatorio")).toBe("deepseek/deepseek-chat-v3-0324");
  });
  it("relatorio + alta_precisao = Sonnet 5", () => {
    expect(ok("alta_precisao", "relatorio")).toBe("anthropic/claude-sonnet-5");
  });

  it("vision + economico = Gemini Flash (caso especial)", () => {
    expect(ok("economico", "vision")).toBe("google/gemini-2.5-flash");
  });
  it("vision + balanceado = fallback (Sonnet 5) + fallbackAplicado", () => {
    const r = modeloParaFeature("balanceado", "vision");
    expect(r.slug).toBe("anthropic/claude-sonnet-5");
    expect(r.fallbackAplicado).toBe(true);
  });
  it("vision + alta_precisao = Sonnet 5", () => {
    expect(ok("alta_precisao", "vision")).toBe("anthropic/claude-sonnet-5");
  });
});

describe("modelos — suportaFeature", () => {
  it("DeepSeek NÃO suporta vision", () => {
    expect(suportaFeature("deepseek/deepseek-chat-v3-0324", "vision")).toBe(false);
  });
  it("DeepSeek suporta chat", () => {
    expect(suportaFeature("deepseek/deepseek-chat-v3-0324", "chat")).toBe(true);
  });
  it("Haiku NÃO suporta vision", () => {
    expect(suportaFeature("anthropic/claude-haiku-4.5", "vision")).toBe(false);
  });
  it("Sonnet 5 suporta tudo", () => {
    expect(suportaFeature("anthropic/claude-sonnet-5", "vision")).toBe(true);
    expect(suportaFeature("anthropic/claude-sonnet-5", "chat")).toBe(true);
    expect(suportaFeature("anthropic/claude-sonnet-5", "relatorio")).toBe(true);
  });
  it("Gemini Flash suporta vision", () => {
    expect(suportaFeature("google/gemini-2.5-flash", "vision")).toBe(true);
  });
  it("slug desconhecido assume que suporta (deixa o provider decidir)", () => {
    expect(suportaFeature("modelo/nao-listado", "vision")).toBe(true);
  });
});

describe("modelos — precosDoModelo", () => {
  it("DeepSeek V3 (1M input, 500k output) ≈ $0.585", () => {
    const p = precosDoModelo("deepseek/deepseek-chat-v3-0324");
    const custo = (p.input * 1_000_000 + p.output * 500_000) / 1_000_000;
    expect(custo).toBeCloseTo(0.585, 3);
  });
  it("Sonnet 5 (1M input, 500k output) ≈ $10.50", () => {
    const p = precosDoModelo("anthropic/claude-sonnet-5");
    const custo = (p.input * 1_000_000 + p.output * 500_000) / 1_000_000;
    expect(custo).toBeCloseTo(10.5, 3);
  });
  it("Gemini Flash é o mais barato (vision)", () => {
    const p = precosDoModelo("google/gemini-2.5-flash");
    expect(p.input).toBe(0.14);
    expect(p.output).toBe(0.28);
  });
  it("slug desconhecido cai no preço do Sonnet 5 + loga warning", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const p = precosDoModelo("modelo/nao-listado");
    expect(p).toEqual({ input: 3.0, output: 15.0 });
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
  it("slug do MODELS.main() NÃO loga warning (caminho comum)", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    precosDoModelo("anthropic/claude-sonnet-5");
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});

describe("modelos — catalogoParaUi", () => {
  it("chat expõe 3 níveis", () => {
    expect(catalogoParaUi().chat).toHaveLength(3);
  });
  it("relatorio expõe 3 níveis", () => {
    expect(catalogoParaUi().relatorio).toHaveLength(3);
  });
  it("vision expõe 2 níveis (sem balanceado)", () => {
    expect(catalogoParaUi().vision).toHaveLength(2);
    const niveis = catalogoParaUi().vision.map((o) => o.nivel);
    expect(niveis).toEqual(["economico", "alta_precisao"]);
  });
});
