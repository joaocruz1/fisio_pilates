import { describe, expect, it } from "vitest";
import { cadastroSchema, loginSchema, redefinirSenhaSchema } from "./auth";

describe("loginSchema", () => {
  it("aceita e-mail e senha válidos", () => {
    const r = loginSchema.safeParse({ email: "ana@example.com", senha: "x" });
    expect(r.success).toBe(true);
  });

  it("rejeita e-mail inválido", () => {
    const r = loginSchema.safeParse({ email: "não-é-email", senha: "x" });
    expect(r.success).toBe(false);
  });

  it("normaliza espaços no e-mail (trim)", () => {
    const r = loginSchema.safeParse({ email: "  ana@example.com  ", senha: "x" });
    expect(r.success && r.data.email).toBe("ana@example.com");
  });
});

describe("cadastroSchema", () => {
  const base = {
    fullName: "Ana Souza",
    email: "ana@example.com",
    senha: "senha1234",
    aceiteLgpd: true,
  };

  it("aceita cadastro completo com LGPD aceita", () => {
    expect(cadastroSchema.safeParse(base).success).toBe(true);
  });

  it("exige aceite da LGPD", () => {
    expect(cadastroSchema.safeParse({ ...base, aceiteLgpd: false }).success).toBe(false);
  });

  it("exige senha de ao menos 8 caracteres", () => {
    expect(cadastroSchema.safeParse({ ...base, senha: "curta" }).success).toBe(false);
  });
});

describe("redefinirSenhaSchema", () => {
  it("exige que as senhas coincidam", () => {
    const r = redefinirSenhaSchema.safeParse({ senha: "senha1234", confirmarSenha: "outra1234" });
    expect(r.success).toBe(false);
  });

  it("aceita senhas iguais e fortes", () => {
    const r = redefinirSenhaSchema.safeParse({ senha: "senha1234", confirmarSenha: "senha1234" });
    expect(r.success).toBe(true);
  });
});
