import { describe, expect, it } from "vitest";
import { avaliacaoSchema } from "./avaliacao";
import { condicaoSchema } from "./condicao";
import { medidaSchema } from "./medida";
import { sessaoSchema } from "./sessao";

describe("avaliacaoSchema", () => {
  it("aplica defaults (kind=initial, goals/contra=[])", () => {
    const r = avaliacaoSchema.safeParse({ assessedAt: "2026-01-10" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.kind).toBe("initial");
      expect(r.data.goals).toEqual([]);
      expect(r.data.contraindications).toEqual([]);
    }
  });

  it("exige data", () => {
    expect(avaliacaoSchema.safeParse({ assessedAt: "" }).success).toBe(false);
  });

  it("limita EVA a 0–10", () => {
    expect(
      avaliacaoSchema.safeParse({ assessedAt: "2026-01-10", painLevelInitial: 12 }).success,
    ).toBe(false);
  });
});

describe("condicaoSchema", () => {
  it("default status = active", () => {
    const r = condicaoSchema.safeParse({ name: "Hérnia" });
    expect(r.success && r.data.status).toBe("active");
  });
  it("exige nome", () => {
    expect(condicaoSchema.safeParse({ name: "" }).success).toBe(false);
  });
});

describe("sessaoSchema", () => {
  it("default status=completed e exercises=[]", () => {
    const r = sessaoSchema.safeParse({ sessionDate: "2026-01-10" });
    expect(r.success && r.data.status).toBe("completed");
    expect(r.success && r.data.exercises).toEqual([]);
  });
  it("valida exercícios: exerciseId deve ser uuid", () => {
    const r = sessaoSchema.safeParse({
      sessionDate: "2026-01-10",
      exercises: [{ exerciseId: "não-uuid" }],
    });
    expect(r.success).toBe(false);
  });
});

describe("medidaSchema", () => {
  it("aceita apenas a data", () => {
    expect(medidaSchema.safeParse({ measuredAt: "2026-01-10" }).success).toBe(true);
  });
  it("rejeita peso negativo", () => {
    expect(medidaSchema.safeParse({ measuredAt: "2026-01-10", weightKg: -5 }).success).toBe(false);
  });
});
