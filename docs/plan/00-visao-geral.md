# Visão Geral do Produto — FisioPilates

Parte do planejamento do FisioPilates. Este é o ponto de entrada da documentação — comece por aqui, depois `08-roadmap.md`. Ele descreve **o que** estamos construindo e **para quem**, o escopo do MVP, o que fica deliberadamente de fora e um glossário que amarra o vocabulário de negócio (pt-BR, usado na UI) aos nomes técnicos do banco (inglês). Os demais documentos (`01-arquitetura.md` em diante) cobrem o **como**.

---

## 1. O produto

**FisioPilates** é um SaaS multi-tenant para **fisioterapeutas autônomas de Pilates** gerenciarem sua carteira de alunos: cadastro, avaliações clínicas, registro de sessões, medidas corporais, documentos (exames, fotos posturais, termos) e, como diferencial, uma camada de **IA** que gera relatórios de evolução estruturados e responde dúvidas técnicas com base em uma base de conhecimento própria (RAG).

Cada profissional opera dentro do seu próprio **tenant** (consultório), com isolamento total de dados no banco (Row Level Security em 100% das tabelas). No MVP, **1 tenant = 1 profissional**, mas o modelo já prevê membership para abrir a porta a times/estúdios no futuro sem reescrever as políticas de segurança.

---

## 2. Público-alvo

Fisioterapeutas **autônomas** que atendem Pilates no Brasil, tipicamente:

- **Pouco técnicas.** Não são a persona de "power user"; usam o celular como ferramenta principal, muitas vezes **na maca, entre um atendimento e outro**. A interface precisa ser óbvia, em pt-BR claro, com feedback explícito de cada ação (salvar/erro).
- **Sem equipe de TI.** Não há administrador de sistema; tudo precisa funcionar sem configuração manual (o tenant nasce pronto no cadastro).
- **Lidam com dado sensível de saúde.** Isso torna LGPD, consentimento e residência de dados no Brasil requisitos de primeira classe, não detalhes.

Consequências de design que atravessam todo o projeto: **mobile-first**, texto de UI 100% em português, JavaScript no cliente reduzido ao mínimo (RSC), e nenhuma etapa que exija conhecimento técnico da usuária.

---

## 3. O problema que resolve

Hoje a fisioterapeuta autônoma de Pilates registra a evolução dos alunos em cadernos, planilhas soltas ou aplicativos genéricos que não entendem o contexto clínico. Isso gera:

- **Perda de histórico e de continuidade** — difícil saber o que foi feito na última sessão, como a dor evoluiu, quais contraindicações existem.
- **Trabalho manual de consolidação** — montar um relatório de evolução para o aluno (ou para outro profissional) é demorado e inconsistente.
- **Dúvidas técnicas sem apoio confiável** — buscas na internet retornam conteúdo genérico, sem citar a fonte e sem respeitar o material que a profissional já possui.
- **Risco de conformidade** — dado de saúde armazenado sem controle de acesso, consentimento ou trilha de auditoria.

O FisioPilates resolve isso concentrando o núcleo clínico (avaliações, sessões, medidas, documentos) em um lugar seguro e transformando esses dados em **relatórios de evolução gerados por IA** e em um **assistente que responde com fontes citadas**, sempre com a profissional revisando e aprovando (humano no circuito).

---

## 4. Funcionalidades do MVP

O MVP é entregue em fases (ver `08-roadmap.md`), cada uma deployada e testável de ponta a ponta. As capacidades finais do MVP são:

1. **Autenticação e onboarding.** Cadastro por e-mail com aceite de LGPD, confirmação de e-mail, recuperação de senha. No primeiro acesso, a profissional completa o perfil (nome, CREFITO, telefone, nome do estúdio). O tenant já existe desde o cadastro.
2. **Gestão de alunos (CRUD).** Lista com busca, cadastro com dados clínicos, ficha do aluno em abas, arquivar/reativar, exclusão com aviso LGPD, registro de consentimento.
3. **Núcleo clínico.** Avaliações (anamnese, postural, testes, queixa, objetivos, contraindicações, EVA), reavaliações, condições/patologias, sessões (exercícios, molas/carga, dor pré/pós, observações), medidas corporais. Fluxos otimizados para registro rápido pós-aula ("repetir última sessão").
4. **Documentos e Storage.** Upload seguro (via signed URL, direto do navegador) de exames, fotos posturais, laudos e termos; preview, download por URL assinada de curta duração, extração de texto de PDFs e pré-processamento de fotos. Trilha de auditoria de acesso.
5. **Base de conhecimento (RAG).** Upload de PDFs técnicos que o pipeline ingere (extração página a página, chunking, embeddings) e disponibiliza para busca híbrida (vetor + full-text em português). Base global (curada) + base por tenant.
6. **Relatórios de evolução com IA + gráficos.** Botão "Gerar análise com IA" que produz um relatório estruturado a partir dos dados do aluno no período, citando fontes da base de conhecimento, com controle de custo (quota por tenant) e cache. Gráficos de dor, frequência, progressão e medidas (Recharts). O relatório nasce como rascunho e passa por aprovação humana.
7. **Chat assistente com RAG.** A profissional tira dúvidas técnicas em linguagem natural; o assistente decide quando buscar na base de conhecimento, na ficha do aluno ou na web (Tavily), citando as fontes. Histórico de conversas persistido.
8. **Vision, LGPD completo e polimento.** Seção postural do relatório a partir de fotos; direitos do titular (exportar dados do aluno, exportar tenant, exclusão em duas fases com purga de Storage); política de privacidade; hardening e qualidade (E2E, advisors, observabilidade).

---

## 5. O que fica FORA do MVP

Escopo cortado deliberadamente para manter o MVP enxuto e entregável. Onde há preparação estrutural, está indicado.

| Fora do MVP | Motivo | Preparação já feita |
|---|---|---|
| **Billing / Stripe** | O MVP valida o produto antes de monetizar; cobrança adiciona complexidade regulatória e de integração sem necessidade imediata. | `tenants.plan` (`free`/`pro`/`trial`) e `plan_expires_at` já existem no schema. |
| **Times / estúdios (múltiplas usuárias por tenant)** | 1 profissional por tenant cobre o público-alvo autônomo. | Tabela `tenant_members` com `role` (`owner`/`member`) e helper RLS `private.user_tenant_ids()` (setof uuid) já suportam N-usuárias-por-tenant sem reescrever policies. |
| **OCR de PDF escaneado** | Adiciona um provedor/custo; a maioria dos exames relevantes é PDF digital com texto extraível. | A extração falha de forma **explícita e em pt-BR** para PDF escaneado, sinalizando o caso ao usuário. |
| **Dark mode** | Simplicidade; público não pediu; dobra o custo de QA visual. | Tokens de marca centralizados em `globals.css` (Tailwind v4) facilitam adicionar depois. |
| **i18n (múltiplos idiomas)** | Produto é Brasil-only; framework de i18n seria peso morto. | Strings de UI centralizadas em `src/lib/textos.ts` (não hard-coded espalhadas), para não fechar a porta. |
| **App do aluno final** | A IA e os dados **nunca** são expostos ao aluno; o produto é ferramenta profissional. Um app do aluno é outro produto. | — |

Outros itens explicitamente pós-MVP (backlog documentado na fase final): export em PDF do relatório, OAuth Google, reranker de retrieval, chunks de documentos de aluno vetorizados, comparação de avaliações lado a lado.

---

## 6. Glossário pt-BR ↔ schema

A UI é 100% em português; o schema do banco é em inglês (decisão de arquitetura — ver C1 em `01-arquitetura.md`). Esta tabela é a fonte de verdade que amarra os dois vocabulários. A camada de textos (`src/lib/textos.ts`) isola o idioma da interface do idioma do banco.

### Entidades de domínio

| Termo na UI (pt-BR) | Tabela/coluna (inglês) | Observação |
|---|---|---|
| Consultório / tenant | `tenants` | O "espaço" da profissional; 1 por profissional no MVP. |
| Profissional (perfil) | `profiles` | 1:1 com `auth.users`; criado por trigger no signup. |
| Vínculo / membership | `tenant_members` | Liga usuária ao tenant (`role` = `owner`). |
| Aluno / aluna | `students` | Paciente/cliente da profissional. |
| Avaliação | `assessments` | Ficha de avaliação; reavaliação = nova linha (`kind = 'reassessment'`). |
| Condição / patologia | `student_conditions` | Condições clínicas do aluno. |
| Exercício | `exercises` | Catálogo de exercícios de Pilates (global + por tenant). |
| Sessão / aula | `sessions` | Registro de um atendimento. |
| Exercício da sessão | `session_exercises` | Exercícios executados numa sessão (molas/carga, `resistance_level`). |
| Medidas / medidas corporais | `body_measurements` | Peso, circunferências, flexibilidade — série temporal. |
| Documento | `documents` | Exames, fotos posturais, laudos, termos; texto extraído em `extracted_text`. |
| Relatório (de evolução) | `ai_reports` | Saída estruturada da IA (`structured jsonb`); nasce rascunho. |
| Base de conhecimento (documento) | `kb_documents` | PDF técnico ingerido para RAG. |
| Trecho / chunk | `kb_chunks` | Pedaço vetorizado + FTS de um documento da base. |
| Conversa (do assistente) | `chat_conversations` | Uma conversa do chat. |
| Mensagem | `chat_messages` | Mensagem no formato `UIMessage` do AI SDK (`parts jsonb`). |
| Registro de auditoria | `audit_logs` | Trilha de acessos/ações sensíveis. |
| Uso de IA | `ai_usage_log` | Consumo de tokens/custo por operação de IA. |

### Termos de campo e conceito

| Termo na UI (pt-BR) | Campo/conceito (inglês) | Observação |
|---|---|---|
| CREFITO | `profiles.crefito` | Registro profissional (COFFITO/CREFITO). |
| Consentimento | `students.consent_signed_at` / `consent_version` | Registro de aceite; bloqueia geração de relatório. |
| Arquivar / inativar | `deleted_at` (soft delete) | Entidades clínicas usam soft delete para o fluxo LGPD. |
| EVA (escala de dor) | dor pré/pós na sessão; EVA na avaliação | Estruturado para virar série temporal e gráfico. |
| Molas / carga | `session_exercises.resistance_level` | Alimenta a progressão por exercício. |
| Escopo (global/tenant) | `scope` (`global` / `tenant`) | Diferencia base curada de base própria na KB. |

---

## 7. Visão de futuro

Após o MVP validar o produto com fisioterapeutas reais, a evolução natural é:

- **Billing / Stripe.** Ativar os planos já modelados (`free`/`pro`/`trial`), com quota de IA como um dos eixos de diferenciação de plano.
- **Times / estúdios.** Habilitar múltiplas profissionais por tenant usando `tenant_members` (`role = 'member'`), com o helper RLS já preparado — sem reescrever segurança.
- **Qualidade de IA.** Reranker de retrieval, embeddings maiores, comparação de avaliações lado a lado, chunks de documentos do próprio aluno.
- **Conveniências.** Export em PDF de relatórios, OAuth Google no login, OCR de PDF escaneado.

Nada disso está no escopo do MVP; está aqui apenas para justificar por que certas escolhas estruturais (membership, campos de plano, env vars de embedding) foram feitas desde já.
