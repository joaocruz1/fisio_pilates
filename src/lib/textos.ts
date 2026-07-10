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
  auth: {
    planoEscolhidoTitulo: "Plano selecionado:",
    planoEscolhidoDesc: "Você poderá concluir a assinatura após criar a conta.",
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
  landing: {
    nav: {
      recursos: "Recursos",
      comoFunciona: "Como funciona",
      planos: "Planos",
      faq: "Perguntas",
      entrar: "Entrar",
      comecarGratis: "Começar grátis",
      abrirMenu: "Abrir menu",
      fecharMenu: "Fechar menu",
    },
    hero: {
      eyebrow: "Fisio · IA · Brasil",
      h1: "A clínica de Pilates da fisioterapeuta autônoma, com IA que cita a fonte e você aprova.",
      sub: "Cadastro, avaliação, sessão, documentos e relatórios de evolução — tudo no seu celular, na maca. Conformidade LGPD de verdade, dados hospedados em São Paulo.",
      ctaPrimario: "Começar grátis",
      ctaSecundario: "Ver planos",
      seloTrial: "14 dias grátis · sem cartão",
      seloBrasil: "100% no Brasil",
    },
    socialProof: {
      lgpd: "LGPD-ready",
      brasil: "Hospedagem 100% no Brasil · sa-east-1",
      pseudo: "Pseudonimização antes da IA",
      crefito: "Pensado para fisioterapeutas CREFITO",
    },
    features: {
      eyebrow: "Tudo o que você precisa",
      titulo: "Da anamnese ao relatório de evolução, num só lugar.",
      subtitulo:
        "Construído para a rotina da fisioterapeuta autônoma que atende Pilates — do celular na maca ao relatório de fim de mês.",
      itens: {
        alunos: {
          titulo: "Gestão de alunas",
          desc: "Cadastro, anamnese, contato direto por WhatsApp. Tudo organizado por aluna, sem planilha solta.",
        },
        avaliacao: {
          titulo: "Avaliação clínica",
          desc: "Anamnese, postural, testes, EVA de dor. Reavaliações viram histórico versionado — nada se perde.",
        },
        sessoes: {
          titulo: "Sessões de Pilates",
          desc: "Aparelho, molas, séries, reps, dor pré e pós. Com o atalho “Repetir última sessão” em 2 minutos.",
        },
        agenda: {
          titulo: "Agenda integrada",
          desc: "Visualize a semana, marque retornos, saiba quem está há 15+ dias sem sessão.",
        },
        documentos: {
          titulo: "Documentos e fotos",
          desc: "Exames, laudos, termos e fotos posturais — upload com signed URL, sem passar pelo seu servidor.",
        },
        kb: {
          titulo: "Base de conhecimento (RAG)",
          desc: "Suba seus livros e apostilas. A IA passa a responder com base neles, citando a página.",
        },
        relatorios: {
          titulo: "Relatórios com IA",
          desc: "Um clique gera rascunho estruturado com fontes citadas. Você revisa e aprova antes de entregar.",
        },
        chat: {
          titulo: "Chat assistente",
          desc: "Tire dúvidas técnicas em linguagem natural, com citações da sua base e da literatura.",
        },
        vision: {
          titulo: "Análise postural (Vision)",
          desc: "Suba até 6 fotos posturais e a IA escreve a seção postural do relatório de evolução.",
        },
      },
    },
    featureDetail: {
      bloco1: {
        eyebrow: "Rotina clínica",
        titulo: "Registre uma sessão em menos de 2 minutos.",
        desc: "O fluxo foi desenhado para o uso com celular em pé, ao lado da maca. “Repetir última sessão” reaplica exercício, aparelho, molas e carga com um toque — você só ajusta o que mudou.",
        bullets: [
          "Aparelho (reformer, cadillac, chair, barrel, mat)",
          "Molas e carga salvas por exercício",
          "Dor pré e pós-sessão em EVA 0–10",
          "Plano da próxima aula sugerido pela IA",
        ],
      },
      bloco2: {
        eyebrow: "Relatórios com IA",
        titulo: "Relatórios que citam a fonte — e você aprova.",
        desc: "A IA lê a ficha pseudonimizada da aluna, busca na sua base de conhecimento e escreve um rascunho estruturado: resumo executivo, evolução no Pilates, evolução postural, pontos de atenção e sugestões. Cada afirmação vem com chip clicável [KB-1] para você conferir.",
        bullets: [
          "Estrutura fixa validada por Zod — sem alucinação de layout",
          "Citação de fontes da sua base pessoal",
          "Cache por período: nada mudou? Não cobramos de novo",
          "Rascunho → revisão → aprovação (humano no circuito)",
        ],
      },
      bloco3: {
        eyebrow: "Vision posturale",
        titulo: "Fotos posturais viram análise clínica.",
        desc: "Anexe até 6 fotos posturais da aluna (anterior, posterior, lateral). A IA descreve a postura, sugere pontos de atenção e alimenta automaticamente a seção postural do relatório de evolução — sempre com você revisando.",
        bullets: [
          "Pré-processamento automático (até 1568px)",
          "Signed URL de 5 minutos — link não vaza",
          "Integração direta com o relatório da aluna",
          "Consentimento LGPD bloqueante",
        ],
      },
    },
    howItWorks: {
      eyebrow: "Como funciona",
      titulo: "Comece a usar em quatro passos.",
      subtitulo:
        "Sem instalação, sem treinamento. Você sobe alunas e a IA aprende sua base enquanto você atende.",
      passos: [
        {
          titulo: "Crie sua conta",
          desc: "E-mail, aceite de LGPD e um onboarding curto com nome, CREFITO e estúdio. Tudo em menos de 3 minutos.",
        },
        {
          titulo: "Importe alunas e documentos",
          desc: "Cadastre a primeira aluna, anexe a anamnese e suba os exames. O sistema já entende o contexto clínico.",
        },
        {
          titulo: "Suba sua base de conhecimento",
          desc: "PDFs de livros e apostilas que você já tem. A IA passa a responder com base neles, citando a página.",
        },
        {
          titulo: "Gere o primeiro relatório",
          desc: "Um clique na aba Evolução. A IA escreve o rascunho, você revisa, ajusta e aprova. Pronto para entregar.",
        },
      ],
    },
    planos: {
      eyebrow: "Preços",
      titulo: "Planos para todo estágio da sua clínica.",
      subtitulo:
        "Comece grátis. Faça upgrade quando precisar. Cancele quando quiser — sem letras miúdas.",
      badgeMaisPopular: "Mais popular",
      planoAtual: "Seu plano atual",
      contratar: "Contratar",
      criarGratis: "Criar conta grátis",
      emBreve: "Em breve",
      porMes: "/mês",
      gratis: "Grátis",
      semCobrancaMensal: "Sem cobrança mensal",
      trialDias: (dias: number) => `${dias} dias grátis · sem cartão`,
      frequencia: {
        mensal: "Mensal",
        anual: "Anual",
        economia: "Economize 20%",
      },
      notaPayg: "Cobrado por uso. Sem mensalidade.",
    },
    testimonials: {
      eyebrow: "Quem usa, recomenda",
      titulo: "Pensado para a rotina de quem atende Pilates.",
      subtitulo:
        "Mais de mil alunas, sessões e relatórios gerados dentro da plataforma. Depoimentos ilustrativos de personas-protótipo do produto.",
      aviso: "Depoimentos ilustrativos — personas representativas do público-alvo.",
      items: [
        {
          nome: "Dra. Ana Lima",
          local: "São Paulo · SP",
          especialidade: "Pilates clínico · coluna",
          quote:
            "Em duas semanas eu já não abria mais a planilha. A IA resume a sessão em segundos e o relatório sai pronto — eu só reviso e entrego.",
        },
        {
          nome: "Dra. Carla Mendes",
          local: "Rio de Janeiro · RJ",
          especialidade: "Reabilitação pós-cirúrgica",
          quote:
            "A base de conhecimento foi o divisor de águas. Subi três livros de Pilates que eu já tinha e o assistente responde com a página certa. Mudou minha prática.",
        },
        {
          nome: "Dra. Beatriz Souza",
          local: "Belo Horizonte · MG",
          especialidade: "Pilates para gestantes",
          quote:
            "O LGPD de verdade me deu tranquilidade. Saber que nome e CPF nunca saem do meu banco antes de irem à IA foi o que me fez assinar.",
        },
      ],
    },
    faq: {
      eyebrow: "Dúvidas frequentes",
      titulo: "Perguntas comuns antes de começar.",
      itens: [
        {
          q: "Meus dados ficam mesmo no Brasil?",
          a: "Sim. Toda a infraestrutura roda em São Paulo (Vercel gru1 e Supabase sa-east-1). Nenhum dado clínico sai do país, em conformidade com a LGPD para dados sensíveis de saúde.",
        },
        {
          q: "Como funciona a base de conhecimento?",
          a: "Você sobe PDFs de livros, apostilas e protocolos que já possui legalmente. O sistema extrai o texto, divide em trechos e gera embeddings. Quando você faz uma pergunta, a IA busca nos seus materiais e cita a página de onde tirou a resposta.",
        },
        {
          q: "Posso cancelar quando quiser?",
          a: "Sim. Sem fidelidade, sem multa. Você pode cancelar a qualquer momento pelo portal de gerenciamento e continua com acesso até o fim do período pago. Os dados ficam preservados caso queira voltar.",
        },
        {
          q: "Como é cobrado o uso de IA?",
          a: "Os planos Essencial, Profissional e Clínica trazem uma cota mensal inclusa de mensagens de chat, relatórios e fotos posturais. No Pay-as-you-go você só paga pelo que usar (R$ 0,10 por mensagem, R$ 3,00 por relatório, R$ 0,50 por foto).",
        },
        {
          q: "A IA substitui minha avaliação?",
          a: "Nunca. A IA é uma ferramenta de apoio. Os relatórios nascem como rascunho para sua revisão e você sempre aprova antes de entregar. O chat tem aviso permanente de que as decisões clínicas são suas.",
        },
        {
          q: "Como funciona o trial de 14 dias?",
          a: "Ao assinar qualquer plano pago, você tem 14 dias gratuitos sem cartão de crédito. Pode usar todas as funções. Ao final, decide se quer continuar — se não fizer nada, a conta volta automaticamente para o Gratuito, sem cobrar nada.",
        },
        {
          q: "Posso compartilhar com outras profissionais?",
          a: "O plano Clínica libera até 5 profissionais no mesmo tenant (estúdio), com isolamento total de dados entre profissionais. Os demais planos são individuais. Multi-profissional com times está na nossa roadmap.",
        },
        {
          q: "Como funciona a análise de fotos posturais?",
          a: "Você anexa até 6 fotos por análise (anterior, posterior, lateral). O sistema reduz a resolução para 1568px, gera uma URL temporária de 5 minutos e envia ao modelo de visão. A IA descreve a postura e essa descrição entra automaticamente na seção postural do relatório de evolução.",
        },
      ],
    },
    finalCta: {
      titulo: "Pronta para transformar a sua clínica?",
      sub: "Comece grátis. Sem cartão. Em 3 minutos você está com a primeira aluna cadastrada.",
      ctaPrimario: "Criar conta grátis",
      ctaSecundario: "Falar com a equipe",
    },
    footer: {
      produto: "Produto",
      empresa: "Empresa",
      legal: "Legal",
      social: "Conecte-se",
      links: {
        recursos: "Recursos",
        planos: "Planos",
        comoFunciona: "Como funciona",
        perguntas: "Perguntas frequentes",
        sobre: "Sobre",
        contato: "Contato",
        privacidade: "Política de privacidade",
        termos: "Termos de uso",
        lgpd: "LGPD",
        cookies: "Cookies",
        status: "Status do sistema",
      },
      copyright: (ano: number) => `© ${ano} FisioPilates. Todos os direitos reservados.`,
      feito: "Feito com cuidado no Brasil.",
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
