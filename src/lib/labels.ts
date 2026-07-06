/** Rótulos pt-BR de valores de domínio (schema em inglês → UI em português). */

export const SEXOS = ["female", "male", "other", "not_informed"] as const;
export type Sexo = (typeof SEXOS)[number];

export const rotuloSexo: Record<Sexo, string> = {
  female: "Feminino",
  male: "Masculino",
  other: "Outro",
  not_informed: "Não informado",
};

export const STATUS_ALUNO = ["active", "paused", "archived"] as const;
export type StatusAluno = (typeof STATUS_ALUNO)[number];

export const rotuloStatusAluno: Record<StatusAluno, string> = {
  active: "Ativo",
  paused: "Pausado",
  archived: "Arquivado",
};
