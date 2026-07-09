/**
 * Passos do tour guiado (onboarding). Cada passo aponta para um elemento com
 * `data-tour="<target>"` numa rota. O provider navega até a rota, espera o alvo
 * e desenha o spotlight + tooltip. Se o alvo não existir, o passo é pulado.
 *
 * Passos com `requiresAluno` só entram quando há um aluno de exemplo; a rota usa
 * `{alunoId}`, substituído em tempo real pelo provider.
 */
export type TourPlacement = "top" | "bottom" | "left" | "right" | "center";

export type TourStep = {
  id: string;
  route: string;
  /** valor de data-tour do alvo; null = tooltip central (sem spotlight). */
  target: string | null;
  title: string;
  body: string;
  placement?: TourPlacement;
  /** só aparece se houver um aluno de exemplo (rota usa {alunoId}). */
  requiresAluno?: boolean;
};

export const TOUR_STEPS: TourStep[] = [
  {
    id: "inicio-menu",
    route: "/dashboard",
    target: "nav-menu",
    title: "Este é o seu menu",
    body: "Tudo fica a um clique: Início, Alunos, Agenda, Assistente, Base de Conhecimento e Configurações. Vamos passar por cada área.",
    placement: "right",
  },
  {
    id: "inicio-stats",
    route: "/dashboard",
    target: "dash-stats",
    title: "Resumo do seu dia",
    body: "No Início você vê num relance os alunos ativos, as aulas da semana e quem precisa de atenção (sem aula há mais de 15 dias).",
    placement: "bottom",
  },
  {
    id: "inicio-hoje",
    route: "/dashboard",
    target: "dash-hoje",
    title: "Agenda de hoje",
    body: "As aulas do dia aparecem aqui com o horário e o aluno. Um clique leva direto à ficha dele.",
    placement: "top",
  },
  {
    id: "alunos-novo",
    route: "/alunos",
    target: "alunos-novo",
    title: "Cadastre seus alunos",
    body: "Comece por aqui: “Novo aluno” cria a ficha. Depois você registra avaliação, aulas, documentos e acompanha a evolução.",
    placement: "bottom",
  },
  {
    id: "alunos-busca",
    route: "/alunos",
    target: "alunos-busca",
    title: "Encontre rápido",
    body: "Busque pelo nome e filtre por status. Clique num aluno para abrir a ficha completa — vamos abrir uma agora.",
    placement: "bottom",
  },
  {
    id: "aluno-abas",
    route: "/alunos/{alunoId}",
    target: "aluno-abas",
    title: "A ficha do aluno",
    body: "Cada aluno tem abas: Dados, Avaliação (anamnese e condições), Aulas, Documentos e Evolução. Vamos ver as principais.",
    placement: "bottom",
    requiresAluno: true,
  },
  {
    id: "aluno-aulas",
    route: "/alunos/{alunoId}/sessoes",
    target: "aluno-aulas-ia",
    title: "Aulas do aluno",
    body: "Registre a aula dada ou deixe a IA montar a próxima com base no histórico. Também dá para importar aulas e ver as agendadas.",
    placement: "bottom",
    requiresAluno: true,
  },
  {
    id: "aluno-evolucao",
    route: "/alunos/{alunoId}/evolucao",
    target: "aluno-evolucao",
    title: "Evolução e relatórios",
    body: "Aqui a IA gera o relatório de evolução do aluno — que você revisa, aprova e baixa em PDF para entregar à aluna.",
    placement: "top",
    requiresAluno: true,
  },
  {
    id: "agenda-alternador",
    route: "/agenda",
    target: "agenda-alternador",
    title: "Sua Agenda",
    body: "Veja o Dia (com o contexto de cada aluno) ou a Semana inteira. É aqui que você acompanha a rotina.",
    placement: "bottom",
  },
  {
    id: "agenda-nova",
    route: "/agenda",
    target: "agenda-nova",
    title: "Agende aulas",
    body: "“Nova aula” marca um horário — inclusive recorrente (ex.: toda terça por 8 semanas). Depois é só registrar a aula, e o agendamento vira “realizado”.",
    placement: "left",
  },
  {
    id: "agenda-dia",
    route: "/agenda",
    target: "agenda-conteudo",
    title: "Acompanhe o dia",
    body: "Cada aula do dia mostra condições do aluno, última aula e atalhos: Registrar aula, Ver ficha e lembrar a aluna no WhatsApp.",
    placement: "top",
  },
  {
    id: "assistente-input",
    route: "/assistente",
    target: "assistente-input",
    title: "Assistente técnico (IA)",
    body: "Tire dúvidas de Pilates e fisioterapia. As respostas usam a sua base de conhecimento e citam as fontes.",
    placement: "top",
  },
  {
    id: "assistente-anexar",
    route: "/assistente",
    target: "assistente-anexar",
    title: "Anexe contexto",
    body: "Fixe um aluno, um plano de aula ou uma análise à conversa para a IA responder já embasada naquele caso.",
    placement: "top",
  },
  {
    id: "kb-niveis",
    route: "/conhecimento",
    target: "kb-niveis",
    title: "Base de Conhecimento",
    body: "A IA usa a base do sistema (curada) + a sua base própria. O medidor mostra o nível de cada uma.",
    placement: "bottom",
  },
  {
    id: "kb-add",
    route: "/conhecimento",
    target: "kb-add",
    title: "Ensine a sua IA",
    body: "Envie PDFs, Word, imagens ou links dos seus cursos e protocolos. Eles entram na busca — e o seu material tem prioridade quando é relevante.",
    placement: "left",
  },
  {
    id: "config",
    route: "/configuracoes",
    target: "config-conteudo",
    title: "Configurações",
    body: "Seu perfil, dados do estúdio, plano e uso de IA ficam aqui.",
    placement: "bottom",
  },
  {
    id: "ajuda",
    route: "/ajuda",
    target: "ajuda-conteudo",
    title: "Ficou com dúvida?",
    body: "Nesta aba você pergunta o que quiser sobre o app e recebe o passo a passo. E pode refazer este tour quando quiser. Bom trabalho! 🎉",
    placement: "top",
  },
];
