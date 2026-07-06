/**
 * Textos da interface, centralizados em pt-BR.
 *
 * A UI é 100% em português; o schema do banco é em inglês (decisão C1). Esta
 * camada isola o idioma da UI dos nomes técnicos — se um dia houver i18n, é
 * aqui que se pluga. Não espalhar strings soltas pelos componentes.
 */
export const textos = {
  app: {
    nome: "FisioPilates",
    tagline: "Gestão de alunos e evolução no Pilates com apoio de IA",
  },
  nav: {
    inicio: "Início",
    alunos: "Alunos",
    assistente: "Assistente",
    conhecimento: "Base de Conhecimento",
    configuracoes: "Configurações",
  },
  acoes: {
    salvar: "Salvar",
    cancelar: "Cancelar",
    excluir: "Excluir",
    editar: "Editar",
    novo: "Novo",
    confirmar: "Confirmar",
  },
  ia: {
    disclaimer:
      "Esta análise é gerada por inteligência artificial como apoio à sua avaliação profissional. " +
      "Não substitui seu julgamento clínico e não constitui diagnóstico ou prescrição.",
  },
} as const;

export type Textos = typeof textos;
