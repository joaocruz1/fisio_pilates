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

// --- Avaliação ---
export const TIPOS_AVALIACAO = ["initial", "reassessment", "discharge"] as const;
export type TipoAvaliacao = (typeof TIPOS_AVALIACAO)[number];
export const rotuloTipoAvaliacao: Record<TipoAvaliacao, string> = {
  initial: "Avaliação inicial",
  reassessment: "Reavaliação",
  discharge: "Alta",
};

// --- Condição / patologia ---
export const STATUS_CONDICAO = ["active", "resolved", "under_observation"] as const;
export type StatusCondicao = (typeof STATUS_CONDICAO)[number];
export const rotuloStatusCondicao: Record<StatusCondicao, string> = {
  active: "Ativa",
  resolved: "Resolvida",
  under_observation: "Em observação",
};

export const SEVERIDADES = ["mild", "moderate", "severe"] as const;
export type Severidade = (typeof SEVERIDADES)[number];
export const rotuloSeveridade: Record<Severidade, string> = {
  mild: "Leve",
  moderate: "Moderada",
  severe: "Grave",
};

// --- Sessão ---
export const STATUS_SESSAO = ["scheduled", "completed", "no_show", "cancelled"] as const;
export type StatusSessao = (typeof STATUS_SESSAO)[number];
export const rotuloStatusSessao: Record<StatusSessao, string> = {
  scheduled: "Agendada",
  completed: "Realizada",
  no_show: "Faltou",
  cancelled: "Cancelada",
};

// --- Exercício (aparelho) ---
export const APARELHOS = [
  "mat",
  "reformer",
  "cadillac",
  "chair",
  "barrel",
  "accessories",
  "other",
] as const;
export type Aparelho = (typeof APARELHOS)[number];
export const rotuloAparelho: Record<Aparelho, string> = {
  mat: "Solo (Mat)",
  reformer: "Reformer",
  cadillac: "Cadillac",
  chair: "Chair",
  barrel: "Barrel",
  accessories: "Acessórios",
  other: "Outro",
};
