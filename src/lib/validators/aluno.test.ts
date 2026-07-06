import { describe, expect, it } from "vitest";
import { atualizarAlunoSchema, criarAlunoSchema } from "./aluno";

describe("criarAlunoSchema", () => {
  it("aceita apenas o nome (demais campos opcionais)", () => {
    expect(criarAlunoSchema.safeParse({ fullName: "Ana Souza" }).success).toBe(true);
  });

  it("rejeita nome muito curto", () => {
    expect(criarAlunoSchema.safeParse({ fullName: "A" }).success).toBe(false);
  });

  it("aceita e-mail vazio, rejeita e-mail inválido", () => {
    expect(criarAlunoSchema.safeParse({ fullName: "Ana", email: "" }).success).toBe(true);
    expect(criarAlunoSchema.safeParse({ fullName: "Ana", email: "xyz" }).success).toBe(false);
    expect(criarAlunoSchema.safeParse({ fullName: "Ana", email: "ana@ex.com" }).success).toBe(true);
  });

  it("rejeita data de nascimento no futuro", () => {
    expect(criarAlunoSchema.safeParse({ fullName: "Ana", birthDate: "2999-01-01" }).success).toBe(
      false,
    );
  });

  it("aceita data de nascimento no passado", () => {
    expect(criarAlunoSchema.safeParse({ fullName: "Ana", birthDate: "1990-05-10" }).success).toBe(
      true,
    );
  });

  it("rejeita sexo fora do enum", () => {
    expect(criarAlunoSchema.safeParse({ fullName: "Ana", sex: "invalido" }).success).toBe(false);
  });
});

describe("atualizarAlunoSchema", () => {
  it("não exige o campo de consentimento", () => {
    expect("consent" in atualizarAlunoSchema.shape).toBe(false);
  });
});
