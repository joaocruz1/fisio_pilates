/**
 * Textos da interface, centralizados em pt-BR.
 *
 * A UI é 100% em português; o schema do banco é em inglês (decisão C1). Esta
 * camada isola o idioma da UI dos nomes técnicos — se um dia houver i18n, é
 * aqui que se pluga. Não espalhar strings soltas pelos componentes.
 */
export const textos = {
  app: {
    nome: "FísioPilates",
    /** Partes do wordmark bicolor da logo ("Físio" azul-céu + "Pilates" marinho). */
    nomeParte1: "Físio",
    nomeParte2: "Pilates",
    tagline: "Gestão de alunos e evolução no Pilates com apoio de IA",
  },
  nav: {
    inicio: "Início",
    alunos: "Alunos",
    agenda: "Agenda",
    aparelhos: "Aparelhos",
    turmas: "Turmas",
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
  tema: {
    titulo: "Aparência",
    descricao: "Escolha como o FísioPilates aparece para você. A preferência acompanha sua conta.",
    rotulo: "Tema",
    alternar: "Mudar tema",
    claro: "Claro",
    escuro: "Escuro",
    sistema: "Sistema",
    erros: { salvar: "Não foi possível salvar sua preferência de tema." },
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
    cortesia: "Plano Premium ativo — acesso completo liberado, sem limites.",
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
      relatorio: "O relatório",
      avaliacao: "A avaliação",
      planos: "Planos",
      faq: "Perguntas",
      entrar: "Entrar",
      criarConta: "Criar conta",
      abrirMenu: "Abrir menu",
      fecharMenu: "Fechar menu",
    },
    meta: {
      titulo: "FísioPilates · o relatório de evolução chega escrito. Você assina.",
      descricao:
        "Você anota a sessão no celular, na maca. No fim do mês o relatório de evolução já está em rascunho, mostrando de onde tirou cada frase. Você lê, corrige e assina.",
    },
    identificacao: {
      campo: "Identificação",
      eyebrow: "Pilates clínico com IA",
      // A quebra é de respiração, não de largura: as duas orações são espelhadas.
      h1a: "O relatório chega escrito.",
      h1b: "Quem assina é você.",
      sub: "Você anota a sessão no celular, ali na maca, entre um atendimento e outro. No fim do mês o relatório de evolução já está em rascunho, mostrando de onde tirou cada frase. Você lê, corrige e assina.",
      ctaPrimario: "Abrir a primeira ficha",
      ctaSecundario: "Ver um relatório de exemplo",
      selo: "14 dias, sem cartão. Seus dados ficam em São Paulo.",
      seloTrial: "14 dias grátis, sem cartão",
      seloDados: "Seus dados ficam em São Paulo",
    },
    confianca: {
      lgpd: { titulo: "LGPD de verdade", desc: "Dado de saúde tratado como dado de saúde." },
      brasil: { titulo: "Dados em São Paulo", desc: "Nada clínico sai do país." },
      pseudo: { titulo: "Sem o nome do paciente", desc: "A IA recebe “aluno 47”, nunca o nome." },
      humano: { titulo: "Você assina", desc: "Nada sai sem a sua aprovação." },
    },
    vitrine: {
      eyebrow: "Por dentro",
      titulo: "Cada resposta mostra de onde veio.",
      sub: "O mesmo motor que escreve o relatório responde as suas dúvidas — sempre citando a página do material, nunca inventando.",
      assistente: {
        eyebrow: "Assistente",
        titulo: "Um assistente que cita a fonte.",
        desc: "Pergunte em português, do jeito que você pensa. A resposta vem apoiada na sua base de conhecimento e na literatura, com a página de onde saiu — para você conferir antes de confiar.",
        bullets: [
          "Responde com base no que você subiu",
          "Cada afirmação traz a fonte",
          "Nunca aparece para os seus alunos",
        ],
      },
      base: {
        eyebrow: "Base de conhecimento",
        titulo: "Seus livros viram a memória da IA.",
        desc: "Suba os PDFs e apostilas que você já tem. O sistema divide em trechos, indexa e passa a responder com base neles — a base da plataforma já vem com 78 materiais clínicos.",
        bullets: [
          "78 materiais clínicos já inclusos",
          "Suba os seus, indexados em minutos",
          "Só materiais que você possui legalmente",
        ],
      },
    },
    evolucao: {
      campo: "Evolução",
      cabecalho: "Aluno 47 · 3ª sessão · junho",
      ajuda: "Toque em uma marca para ver de onde a frase veio.",
      partes: [
        { texto: "Na 3ª sessão em reformer, com molas azul e vermelha, executou " },
        { citado: "footwork 3×10 sem dor referida", fonte: "KB-1" },
        { texto: ". A EVA caiu de 6 para 3, consistente com " },
        {
          citado: "ganho de controle motor de tronco entre o 3º e o 5º atendimento",
          fonte: "KB-2",
        },
        { texto: "." },
      ],
      fontes: {
        "KB-1": {
          arquivo: "Ficha do aluno · 3ª sessão",
          local: "sua anotação",
          trecho: "reformer · azul+verm · footwork 3x10 · sem dor · eva 6→3",
        },
        "KB-2": {
          arquivo: "Kolyniak, Pilates: método e aplicação clínica",
          local: "p. 112",
          trecho:
            "O controle motor de tronco costuma se estabelecer entre o terceiro e o quinto atendimento, quando a carga é progredida sem dor referida.",
        },
      },
      seloPendente: "rascunho, aguarda você",
      acaoAssinar: "Aprovar e assinar",
      seloAssinado: (hora: string) => `assinado por você · hoje, ${hora}`,
      acaoDesfazer: "desfazer",
      anuncioAssinado: "Relatório aprovado e assinado.",
      anuncioDesfeito: "Assinatura desfeita. O relatório voltou a rascunho.",
      aviso: "Exemplo. O aluno 47 não existe.",
      verFonte: "ver de onde veio",
      fecharFonte: "fechar",
    },
    prontuario: {
      campo: "A avaliação",
      cabecalho: "Aluno 47 · sessão de hoje",
      h2: "É isto que você digita. O resto vem de graça.",
      sub: "A ficha de uma aula, do jeito que ela sai do seu dedo em pé ao lado da maca. Foi só disto que o relatório lá em cima nasceu.",
      ficha: [
        { rotulo: "aparelho", valor: "reformer" },
        { rotulo: "molas", valor: "azul + vermelha" },
        { rotulo: "série", valor: "footwork 3×10" },
      ],
      dorAntes: "dor antes",
      dorDepois: "dor depois",
      // A escala EVA é a aferição de verdade do produto: um corpo medido contra
      // uma referência de 0 a 10. Por isso ela é o clímax e não precisa de foto.
      eva: (valor: number) => `${valor} de 10 na escala de dor`,
      remate: "Dois minutos de digitação. É isso.",
    },
    dados: {
      campo: "Onde o dado dorme",
      h2: 'A IA recebe "aluno 47". Nunca o nome do seu paciente.',
      corpo:
        "Os dados dos seus alunos ficam em servidores em São Paulo. Antes de qualquer coisa ir para a IA, o nome sai. E ninguém treina modelo nenhum com o que está aí dentro.",
    },
    fecho: {
      h2: "O rascunho é nosso. A assinatura é sua.",
      honestidade:
        "Ainda não temos depoimentos. Temos os dados em São Paulo, 14 dias grátis e o relatório de exemplo aí em cima.",
    },
    planos: {
      campo: "Planos",
      titulo: "Comece grátis. Suba de plano quando fizer sentido.",
      subtitulo: "Cancele quando quiser. Você continua com acesso até o fim do período pago.",
      badgeMaisPopular: "Mais popular",
      planoAtual: "Seu plano atual",
      contratar: "Contratar",
      criarGratis: "Criar conta grátis",
      emBreve: "Em breve",
      porMes: "/mês",
      gratis: "Grátis",
      semCobrancaMensal: "Sem cobrança mensal",
      trialDias: (dias: number) => `${dias} dias grátis, sem cartão`,
      frequencia: {
        mensal: "Mensal",
        anual: "Anual",
        economia: "Economize 20%",
      },
      notaPayg: "Cobrado por uso. Sem mensalidade.",
      notaPreco: "Preços em reais. O pagamento é processado pelo Stripe.",
    },
    faq: {
      campo: "Perguntas",
      titulo: "O que costumam perguntar antes de assinar.",
      itens: [
        {
          q: "Os dados dos meus alunos ficam no Brasil?",
          a: "Ficam. O banco e a aplicação rodam em São Paulo, e nada de clínico sai do país. É o que a LGPD exige para dado de saúde, e é o motivo de termos escolhido São Paulo antes de escolher qualquer outra coisa.",
        },
        {
          q: "A IA lê o nome do meu paciente?",
          a: 'Não. Antes de qualquer coisa ir para a IA, o nome, o CPF e o contato saem. A IA recebe "aluno 47" e os dados clínicos, escreve o rascunho, e o nome volta aqui do nosso lado. Também desligamos a coleta de dados do provedor: ninguém treina modelo com o que está aqui dentro.',
        },
        {
          q: "A IA decide alguma coisa por mim?",
          a: "Nenhuma. O relatório nasce rascunho e fica parado até você aprovar. Você lê, corrige o que estiver errado e assina. Se não assinar, ele não vai para lugar nenhum. A responsabilidade clínica continua sendo sua, e o sistema foi desenhado para deixar isso claro.",
        },
        {
          q: "De onde a IA tira o que escreve?",
          a: "Da ficha do seu aluno e dos materiais que você mesma subiu. Cada frase do rascunho traz uma marca que você toca para ver a origem: a sua anotação da sessão, ou a página do livro que você anexou. Se não houver fonte, ela não afirma.",
        },
        {
          q: "Posso cancelar quando quiser?",
          a: "Pode, sem multa e sem falar com ninguém. Você cancela pelo próprio painel e continua com acesso até o fim do período que já pagou. Seus dados ficam guardados caso você volte.",
        },
      ],
    },
    footer: {
      produto: "Produto",
      legal: "Legal",
      links: {
        relatorio: "O relatório",
        avaliacao: "A avaliação",
        planos: "Planos",
        perguntas: "Perguntas",
        privacidade: "Política de privacidade",
      },
      copyright: (ano: number) => `© ${ano} FísioPilates`,
      feito: "Feito no Brasil, com dados no Brasil.",
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
