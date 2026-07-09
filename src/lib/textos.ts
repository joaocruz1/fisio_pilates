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
    agenda: "Agenda",
    assistente: "Assistente",
    conhecimento: "Base de Conhecimento",
    configuracoes: "Configurações",
    ajuda: "Ajuda",
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
  billing: {
    titulo: "Assinatura",
    subtitulo: "Gerencie seu plano, métodos de pagamento e faturas.",
    planoAtual: "Plano atual",
    semAssinatura:
      "Você está no plano gratuito. Faça upgrade para liberar mais alunas, mensagens e relatórios.",
    semCobranca: "Sem cobrança",
    cortesia: "Plano Vitalício (cortesia)",
    gratis: "Grátis",
    trial: (dias: number) => `Trial de ${dias} dias`,
    trialTerminaEm: (data: string) =>
      `Seu trial termina em ${data}. Adicione um método de pagamento para continuar.`,
    cancelarTrialRestante: "Cancelar e voltar ao Gratuito",
    mudarPlano: "Mudar plano",
    gerenciarAssinatura: "Gerenciar assinatura",
    abrirPortal: "Abrir portal de gerenciamento",
    cancelarAssinatura: "Cancelar assinatura",
    reativarAssinatura: "Reativar assinatura",
    assinaturaTerminaEm: (data: string) =>
      `Sua assinatura termina em ${data}. Você ainda tem acesso até lá.`,
    compararPlanos: "Comparar planos",
    recursos: "Recursos",
    preco: "Preço",
    porMes: "/mês",
    assinar: "Assinar",
    continuar: "Continuar",
    trial14Dias: "14 dias grátis",
    semCartao: "Sem cartão de crédito",
    cancelarQuandoQuiser: "Cancele quando quiser",
    proximaFatura: "Próxima fatura estimada",
    status: {
      active: "Ativa",
      trialing: "Em trial",
      past_due: "Pagamento pendente",
      canceled: "Cancelada",
      unpaid: "Inadimplente",
      paused: "Pausada",
    },
    aviso: {
      suspensao:
        "Sua assinatura está suspensa por inadimplência. Regularize para reativar e continuar usando.",
      pastDue:
        "Identificamos um problema no seu último pagamento. Vamos retentar automaticamente; enquanto isso, mantenha o uso.",
      cancelada:
        "Sua assinatura foi cancelada. Os dados estão preservados; reative para continuar.",
    },
    erroCheckout: "Não foi possível iniciar o checkout. Tente novamente em alguns instantes.",
    erroPortal: "Não foi possível abrir o portal de gerenciamento.",
    erroCancelar: "Não foi possível cancelar a assinatura.",
  },
  admin: {
    titulo: "Painel administrativo",
    bemVindo: "Bem-vindo(a) ao painel de controle do SaaS.",
    voltar: "Voltar ao app",
    sair: "Sair do painel",
    kpi: {
      mrr: "Receita mensal recorrente (MRR)",
      tenants: "Tenants ativos",
      novosMes: "Novos este mês",
      churnMes: "Cancelamentos este mês",
      usoIa: "Custo de IA (mês atual)",
      relatoriosGerados: "Relatórios gerados (mês)",
      topConsumidores: "Top consumidores de IA",
    },
    nav: {
      dashboard: "Dashboard",
      tenants: "Tenants",
      subscriptions: "Assinaturas",
      invoices: "Faturas",
      aiUsage: "Uso de IA",
      kb: "Base global",
      lgpd: "LGPD",
      audit: "Auditoria",
      admins: "Admins",
    },
    tenants: {
      titulo: "Tenants",
      busca: "Buscar por nome, email ou ID",
      filtroStatus: "Status",
      filtroPlano: "Plano",
      todos: "Todos",
      acoes: "Ações",
      suspender: "Suspender",
      reativar: "Reativar",
      estender: "Estender trial",
      verFicha: "Ver ficha",
      suspenderConfirm: (nome: string) =>
        `Tem certeza que deseja suspender ${nome}? Os dados serão preservados, mas novas alunas/sessões não poderão ser criadas.`,
      reativarConfirm: (nome: string) => `Reativar ${nome}?`,
    },
    subscriptions: {
      titulo: "Assinaturas",
      tenant: "Tenant",
      plano: "Plano",
      status: "Status",
      proximaCobranca: "Próxima cobrança",
      cancelarEm: "Cancela em",
    },
    invoices: {
      titulo: "Faturas",
      tenant: "Tenant",
      valor: "Valor",
      status: "Status",
      emitidaEm: "Emitida em",
      pagaEm: "Paga em",
      ver: "Ver no Stripe",
    },
    aiUsage: {
      titulo: "Uso de IA",
      agregado: "Custo agregado por tenant (mês atual)",
      porModelo: "Custo por modelo",
    },
    audit: {
      titulo: "Auditoria",
      acao: "Ação",
      ator: "Ator",
      alvo: "Alvo",
      data: "Data",
    },
    admins: {
      titulo: "Administradores",
      novo: "Novo administrador",
      email: "E-mail",
      role: "Papel",
      criar: "Criar",
      revogar: "Revogar",
      confirmar: "Confirmar",
      semPermissao: "Apenas super admins podem gerenciar outros admins.",
    },
    erro: {
      carregar: "Não foi possível carregar os dados. Tente novamente.",
      acaoFalhou: "A ação falhou. Verifique o log de auditoria.",
    },
  },
  modelo: {
    titulo: "Qualidade da IA",
    descricao:
      "Escolha o nível de qualidade para cada recurso. O modo mais rápido gasta menos, o mais preciso gasta mais. Você pode mudar a qualquer momento.",
    badge: "IA",
    niveis: {
      economico: {
        label: "Mais rápido",
        desc: "Respostas ágeis, menor custo por uso. Ótimo para o dia a dia.",
        custo: "Menor custo",
        icone: "leve",
      },
      balanceado: {
        label: "Equilibrado",
        desc: "O melhor dos dois mundos para a maioria das tarefas.",
        custo: "Custo moderado",
        icone: "medio",
      },
      alta_precisao: {
        label: "Mais preciso",
        desc: "Máxima qualidade. Recomendado para casos clínicos sensíveis.",
        custo: "Maior custo",
        icone: "alto",
      },
    },
    campos: {
      chat: {
        label: "Assistente de chat",
        ajuda: "Respostas no chat da assistente.",
      },
      report: {
        label: "Relatórios e planos de aula",
        ajuda: "Relatórios de evolução e plano da próxima aula.",
      },
      vision: {
        label: "Análise de fotos",
        ajuda: "Imagens posturais, exames e documentos escaneados.",
      },
    },
    picker: {
      placeholder: "Padrão",
      hint: "Usa o nível salvo em Configurações",
    },
    eixos: {
      velocidade: {
        label: "Velocidade",
        ajuda: "Quanto maior, mais rápido responde (e mais barato).",
        niveis: {
          1: "Lento",
          2: "Normal",
          3: "Rápido",
        },
      },
      precisao: {
        label: "Precisão",
        ajuda: "Quanto maior, mais cuidadosa é a resposta.",
        niveis: {
          1: "Básica",
          2: "Boa",
          3: "Alta",
        },
      },
    },
    erros: {
      salvar: "Não foi possível salvar suas preferências.",
    },
  },
} as const;

export type Textos = typeof textos;
