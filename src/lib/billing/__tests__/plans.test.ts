import { describe, expect, it } from "vitest";
import {
  PLAN_IDS,
  PLANOS,
  PLANOS_PAGOS_COM_CARTAO,
  planoPorId,
  precoBRLFormatado,
  precoPlanoFormatado,
  validarCatalogo,
} from "@/lib/billing/plans";

describe("plans — catálogo", () => {
  it("todos os 6 planos estão presentes", () => {
    expect(PLAN_IDS).toEqual(["free", "essencial", "profissional", "clinica", "payg", "vitalicio"]);
    for (const id of PLAN_IDS) {
      expect(PLANOS[id]).toBeDefined();
      expect(PLANOS[id].id).toBe(id);
    }
  });

  it("preços coerentes (centavos)", () => {
    expect(PLANOS.free.precoCentavosBRL).toBe(0);
    expect(PLANOS.essencial.precoCentavosBRL).toBe(4990);
    expect(PLANOS.profissional.precoCentavosBRL).toBe(9990);
    expect(PLANOS.clinica.precoCentavosBRL).toBe(19990);
    expect(PLANOS.payg.precoCentavosBRL).toBe(0);
    expect(PLANOS.vitalicio.precoCentavosBRL).toBe(0);
  });

  it("limites crescem (free < essencial < profissional < clinica)", () => {
    expect(PLANOS.free.limiteAlunos).toBe(3);
    expect(PLANOS.essencial.limiteAlunos).toBe(20);
    expect(PLANOS.profissional.limiteAlunos).toBeNull();
    expect(PLANOS.clinica.limiteAlunos).toBeNull();
  });

  it("vitalício é ilimitado em tudo e não muda de plano", () => {
    expect(PLANOS.vitalicio.limiteAlunos).toBeNull();
    expect(PLANOS.vitalicio.limiteChat).toBeNull();
    expect(PLANOS.vitalicio.limiteRelatorios).toBeNull();
    expect(PLANOS.vitalicio.limiteVision).toBeNull();
    expect(PLANOS.vitalicio.permiteMudar).toBe(false);
    expect(PLANOS.vitalicio.stripePriceId).toBeNull();
  });

  it("payg tem limites zero nas cotas (cobra só por uso)", () => {
    expect(PLANOS.payg.limiteChat).toBe(0);
    expect(PLANOS.payg.limiteRelatorios).toBe(0);
    expect(PLANOS.payg.limiteVision).toBe(0);
    expect(PLANOS.payg.permiteMudar).toBe(true); // é configurável; payg não é flag
  });

  it("apenas 4 planos têm trial", () => {
    expect(PLANOS.free.trialDias).toBe(0);
    expect(PLANOS.vitalicio.trialDias).toBe(0);
    expect(PLANOS.payg.trialDias).toBe(0);
    for (const id of ["essencial", "profissional", "clinica"] as const) {
      expect(PLANOS[id].trialDias).toBe(14);
    }
  });

  it("PLANOS_PAGOS_COM_CARTAO contém só os pagos com cartão", () => {
    expect(PLANOS_PAGOS_COM_CARTAO).toEqual(
      expect.arrayContaining(["essencial", "profissional", "clinica", "payg"]),
    );
    expect(PLANOS_PAGOS_COM_CARTAO).not.toContain("free");
    expect(PLANOS_PAGOS_COM_CARTAO).not.toContain("vitalicio");
  });
});

describe("plans — helpers", () => {
  it("planoPorId retorna free para entrada vazia/unknown", () => {
    expect(planoPorId(null).id).toBe("free");
    expect(planoPorId(undefined).id).toBe("free");
    expect(planoPorId("desconhecido").id).toBe("free");
  });

  it("planoPorId retorna o plano correto", () => {
    expect(planoPorId("essencial").id).toBe("essencial");
    expect(planoPorId("vitalicio").id).toBe("vitalicio");
  });

  it("preço formatado em BRL pt-BR", () => {
    expect(precoBRLFormatado(4990)).toMatch(/49,90/);
    expect(precoPlanoFormatado(PLANOS.essencial)).toMatch(/49,90/);
    expect(precoPlanoFormatado(PLANOS.free)).toBe("Grátis");
  });

  it("validarCatalogo não encontra erros no catálogo", () => {
    const r = validarCatalogo();
    expect(r.erros).toEqual([]);
    expect(r.ok).toBe(true);
  });
});
