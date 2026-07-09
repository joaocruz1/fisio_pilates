# Relatório de QA — FisioPilates

Sessão de teste manual ponta a ponta (via Chrome MCP + inspeção de logs/banco), logado como `rhenata@gmail.com` em `http://localhost:3001`. Cobertura: login/logout, dashboard, alunos (criar/editar/arquivar/reativar/buscar/filtrar), avaliação/anamnese, sessões + geração de próxima aula com IA, import de documentos (PDF/DOCX/imagem/texto colado), evolução + relatório de IA, assistente (chat RAG), base de conhecimento, configurações.

Formato: **[SEVERIDADE] Título** — passos para reproduzir, esperado vs. observado, causa raiz e sugestão de correção quando aplicável.

Severidades: 🔴 Crítico (feature principal quebrada) · 🟠 Alto (funcionalidade quebrada ou falha silenciosa) · 🟡 Médio (UX/visual) · 🔵 Sugestão (melhoria)

## Status das correções (atualizado após o desenvolvimento)

Todos os achados foram corrigidos e validados. Gates: **typecheck ✓ · biome ✓ · build ✓ · vitest 24/24 ✓**. As 3 features de IA foram testadas ao vivo e retornam 200.

| # | Severidade | Achado | Status |
|---|---|---|---|
| 1 | 🔴 Crítico | Validação de env quebra 100% das features de IA | ✅ **Corrigido** — env opcional + **2ª causa raiz** (schema `.int()` do Zod 4) |
| 2 | 🟠 Alto | Chat do Assistente não mostra erro na falha | ✅ **Corrigido** — bolha de erro + "Tentar novamente" |
| 3 | 🟠 Alto | Transcrição de imagem falha silenciosamente | ✅ **Corrigido** — `console.error`/`console.warn` no catch |
| 4 | 🟠 Alto | Toasts (sonner) presos 7-11s | ✅ **Corrigido** — removido `useTheme()` órfão |
| 5 | 🟡 Médio | Dropdown do menu sobrepõe botão do header | ⚪ **Falso positivo** — artefato da transição de página; render estável está correto |
| 6 | 🟡 Médio | Material da KB fica "Na fila" para sempre | ✅ **Corrigido** — ingestão inline sem QStash + botão "Reprocessar" |
| 7 | 🔵 Sugestão | Excluir conversa sem confirmação | ✅ **Corrigido** — `ConfirmDialog` |
| 8 | 🟠 Alto | (novo) `mapAiError` engolia o erro cru do provedor de IA | ✅ **Corrigido** — loga o stack antes de mapear |
| 9 | 🟡 Médio | (novo) Relatório/plano de IA com `failed` ficava em cache e não deixava retentar | ✅ **Corrigido** — reaproveita e regenera linhas `failed` |

### Detalhe da causa raiz #1 (duas camadas)
O env era a **primeira** barreira. Ao corrigi-lo, uma **segunda causa** apareceu: o `planoAulaSchema` usava `z.number().int()`, e no **Zod 4** o `.int()` emite `minimum`/`maximum` (o range de inteiro seguro) no JSON Schema — que o Anthropic **rejeita** em tipo `integer` (`output_config.format.schema: For 'integer' type, properties maximum, minimum are not supported`). Trocado por `z.number()` puro (com "inteiro" no `.describe()`), e removido `.min(1)` do array (evita `minItems`). Validado ao vivo: plano gerado com 5 exercícios do catálogo citando a base de conhecimento, pré-preenchendo a Nova Sessão.

---

## Achados originais (detalhe)

| # | Severidade | Achado | Área |
|---|---|---|---|
| 1 | 🔴 Crítico | Validação de env quebra **100% das features de IA** (próxima aula, relatório de evolução, chat) | IA |
| 2 | 🟠 Alto | Chat do Assistente não mostra nenhum erro quando a chamada falha | Assistente |
| 3 | 🟠 Alto | Transcrição de imagem/PDF escaneado falha silenciosamente, sem log | Documentos |
| 4 | 🟠 Alto | Toasts (sonner) não respeitam a duração padrão, ficam presos 7-11s | Global |
| 5 | 🟡 Médio | Dropdown do menu do usuário sobrepõe visualmente o botão de ação do header | Global |
| 6 | 🟡 Médio | Material da Base de Conhecimento fica "Na fila" para sempre, sem retry | Base de Conhecimento |
| 7 | 🔵 Sugestão | Excluir conversa do Assistente não pede confirmação | Assistente |

Todo o resto testado (autenticação, CRUD de alunos, avaliação, sessões, upload de documentos com extração de texto, medidas corporais, exportação LGPD, edição de perfil) **funcionou corretamente** — ver seção "✅ Fluxos validados sem problemas" ao final.

---

## 1. 🔴 CRÍTICO — Validação de env quebra 100% das features de IA (QStash/Tavily exigidos mesmo sem uso)

- **Onde**: `src/lib/env.ts:26-30`. `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY` e `TAVILY_API_KEY` são declarados como `z.string().min(1)` (obrigatórios), mas no `.env.local` atual eles estão vazios — QStash/Tavily não foram provisionados, uma decisão consciente do projeto (documentada como "não afeta o seed nem o retrieval").
- **Causa raiz**: `env()` valida o **schema inteiro de uma vez só** (`serverSchema.safeParse(process.env)`) e lança exceção se **qualquer** campo falhar. Não há distinção entre "obrigatório para este caminho de código" e "obrigatório para a feature X" — então qualquer função que chame `env()`, mesmo que só precise de `OPENROUTER_API_KEY`, quebra por causa de variáveis completamente não relacionadas (QStash é usado só pela fila de ingestão da KB; Tavily só pelo fallback de busca web).
- **Impacto confirmado neste QA — as 3 features de IA do produto, uma por uma**:
  1. **"Gerar próxima aula com IA"** (Sessões → botão): `POST /api/ai/next-session 500`, toast "Não foi possível gerar o plano.".
     ```
     ⨯ Error: Variáveis de ambiente inválidas ou ausentes:
     ✖ Too small: expected string to have >=1 characters → at QSTASH_TOKEN / QSTASH_CURRENT_SIGNING_KEY / QSTASH_NEXT_SIGNING_KEY / TAVILY_API_KEY
         at env (src/lib/env.ts:41:11)
         at gerarEmbeddings (src/lib/ai/embeddings.ts:11:16)
         at gerarEmbedding (src/lib/ai/embeddings.ts:31:21)
         at ragSearch (src/lib/ai/rag.ts:25:41)
         at async buildDossie (src/lib/ai/dossie.ts:154:36)
         at async POST (src/app/api/ai/next-session/route.ts:32:18)
     ```
  2. **Relatórios de evolução com IA** (aba Evolução → "Gerar análise com IA"): mesma cadeia (`buildDossie` → `ragSearch` → `gerarEmbeddings` → `env()`), `POST /api/ai/analyses 500`, toast "Não foi possível gerar a análise.".
  3. **Assistente (chat)**: aqui o erro é ainda mais direto — nem chega a usar RAG; a própria construção do client `openrouter()` (`src/lib/ai/client.ts:12`) já chama `env()` e quebra. `POST /api/ai/chat 500`. E pior: **a UI do chat não mostra nenhum erro** (ver achado #2).
- **Conclusão**: com a configuração atual (QStash/Tavily não provisionados — o cenário esperado para rodar localmente sem essas integrações), **100% das features de IA do produto estão inoperantes**. Não é uma falha pontual — é a única coisa impedindo o app de funcionar de ponta a ponta como projetado.
- **Sugestão de correção**: tornar `QSTASH_*` e `TAVILY_API_KEY` opcionais no `serverSchema` (`z.string().optional()`), validando a presença deles apenas nos pontos que realmente os usam (rota de ingestão QStash; fallback Tavily dentro do `ragSearch`) — não na validação global de `env()`. Alternativamente, separar `serverSchema` em sub-schemas por integração.

## 2. 🟠 Assistente: quando a chamada à IA falha, o chat não mostra nenhum erro ao usuário

- **Passos**: em `/assistente`, enviar qualquer pergunta (ex.: clicar na sugestão "Exercícios indicados para hérnia de disco lombar?").
- **Esperado**: se `POST /api/ai/chat` falhar, o chat deveria mostrar um erro (toast, bolha de erro, "Não foi possível responder. Tente novamente.") — como acontece corretamente nos outros 2 fluxos de IA (próxima aula e evolução, achado #1).
- **Observado**: a pergunta aparece na bolha azul normalmente, mas **nenhuma resposta, erro ou indicador de carregamento aparece** — a tela fica parada indefinidamente (testei 7s+) sem feedback visual algum. Só foi possível confirmar a falha real (`POST /api/ai/chat 500`) olhando o log do servidor. Reproduzi o mesmo em uma conversa antiga já existente antes deste QA ("Como progredir o core no reformer?") — confirma que o problema é sistêmico, não um acaso desta sessão.
- **Sugestão de correção**: tratar o estado de erro do hook de chat (`useChat`/`@ai-sdk/react`) e renderizar uma mensagem de erro visível no lugar da resposta ausente.

## 3. 🟠 Transcrição de imagem/PDF escaneado por visão de IA falha silenciosamente (sem log, sem aviso)

- **Onde**: `src/server/services/transcribe.ts:46-48` — `catch { return null; }` engole qualquer erro da chamada `generateText` (rede, rate limit, timeout, imagem rejeitada) sem nenhum `console.error`/log estruturado. Além disso, `t.length > 10 ? ... : null` (linha 45) descarta qualquer resposta curta do modelo como se fosse falha, sem diferenciar "IA respondeu pouco" de "a chamada falhou".
- **Passos**: em Documentos de um aluno, importar uma imagem (`image/png`) como categoria "Aula". Upload é aceito e mostra "documento(s) enviado(s)." normalmente, sem erro.
- **Observado**: subi `foto-postural-teste.png` (imagem mínima válida, 68 bytes). Consulta direta no banco mostra `extracted_text` com 0 caracteres:
  ```
  file_name                | mime_type | size_bytes | extracted_len
  foto-postural-teste.png  | image/png |         68 |             0
  ```
  A chamada de `confirmarUpload` para o PNG levou **513ms** — tempo incompatível com uma chamada real de visão a um modelo (tipicamente 1-5s+), sugerindo que `generateText` falhou rápido e foi engolida pelo `catch`, em vez de ter realmente consultado o modelo.
- **Ressalva**: o arquivo de teste é uma imagem quase vazia (não uma ficha real fotografada), então não é 100% conclusivo que a IA "deveria" ter extraído algo. Mas o problema central — falha silenciosa, sem log, sem diferenciar "sem conteúdo" de "erro de API" — se mantém independente do conteúdo da imagem, e é sério: em produção, o profissional nunca saberá que o histórico de um documento real não entrou no conhecimento da IA.
- **Sugestão de correção**: logar o erro no `catch` antes de retornar `null`, e considerar persistir um status (`extraction_status: 'failed' | 'empty' | 'ok'`) no documento para exibir na UI em vez de ficar indistinguível de "documento sem texto".

## 4. 🟠 Toasts (sonner) não respeitam a duração padrão — ficam 7-11s na tela em vez de ~4s

- **Passos reproduzidos em 2 telas diferentes**: (1) em `/login`, errar a senha, depois logar corretamente; (2) na ficha do aluno, clicar "Arquivar" e depois "Reativar" no menu ⋮.
- **Esperado**: cada toast deveria desaparecer sozinho após a duração padrão do sonner (~4s), mesmo sem interação do usuário.
- **Observado**: em todos os casos o toast permaneceu visível por 7-11s, mesmo com o cursor longe da área do toast (afastando a hipótese de "pausa por hover" do sonner). O toast de erro do login ("E-mail ou senha incorretos.") continuou visível sobre o dashboard já logado com sucesso — visualmente confuso logo após um login bem-sucedido.
- **Causa provável**: `src/components/ui/sonner.tsx:3,8` usa `useTheme()` de `next-themes`, mas **não existe nenhum `ThemeProvider` de `next-themes` montado no app** (confirmado via `grep -rn "ThemeProvider" src`, sem resultados). Como o produto decidiu por tema único claro sem dark mode, esse hook provavelmente ficou órfão do boilerplate padrão do shadcn/ui. Sem o provider, `useTheme()` pode ficar re-sincronizando e atrapalhar o timer interno de auto-dismiss do `<Sonner>`.
- **Sugestão de correção**: remover o `useTheme()` do `sonner.tsx` e fixar `theme="light"` diretamente (já que não há dark mode), ou adicionar um `ThemeProvider` real se dark mode for reconsiderado no futuro.

## 5. 🟡 Dropdown do menu do usuário sobrepõe visualmente o botão de ação do header

- **Passos**: logar, ir ao Dashboard (ou qualquer página com botão de ação no `PageHeader`, ex. "Novo aluno"), clicar em "Rhenata Siqueira" no canto superior direito.
- **Esperado**: o menu dropdown abre por cima de todo o conteúdo, sem sobreposição visual.
- **Observado**: o item "Configurações" do dropdown renderiza visualmente colado/atrás do botão de ação do header (o botão aparece "vazando" através do menu) — aparenta z-index do dropdown menor que o esperado, ou o dropdown não usa portal e fica no fluxo normal sob o botão fixo do header.
- **Componente provável**: `src/components/layout/user-menu.tsx`.

## 6. 🟡 Base de Conhecimento: material enviado fica "Na fila" para sempre, sem retry

- **Onde**: `src/server/actions/conhecimento.ts:62-71` (`confirmarUploadKb`). Este código já é tolerante à falta de QStash de propósito — `try { await qstashClient().publishJSON(...) } catch { /* silencioso */ }` — o cadastro não quebra (diferente do achado #1). O documento é gravado com `status: "queued"` e a UI já mostra corretamente um badge "Na fila" (isso funciona bem).
- **Passos**: Base de Conhecimento → "Enviar material" → subi um PDF de teste com a declaração de licença marcada.
- **Observado**: toast "Material enviado. A ingestão será processada em segundo plano."; o item aparece no topo da lista com badge "Na fila". Confirmado no banco: `status='queued'`, `chunk_count=0`. Como o QStash não está configurado, o job de ingestão nunca roda — o documento fica "Na fila" indefinidamente, sem botão de "reprocessar" e sem nenhum aviso de que, na prática, ele nunca vai sair desse estado.
- **Sugestão de correção**: um botão manual de "reprocessar" (útil tanto para quando QStash for configurado quanto para retries de falha pontual), e/ou um aviso após N minutos "na fila" sugerindo contatar o suporte.

## 7. 🔵 Assistente: excluir conversa não pede confirmação

Clicar no ícone de lixeira ao lado de uma conversa na lista lateral apaga imediatamente ("Conversa apagada."), sem diálogo de confirmação. Ação destrutiva de baixo risco (não é dado clínico do aluno), mas um "tem certeza?" evitaria cliques acidentais.

---

## ✅ Fluxos validados sem problemas

- **Autenticação**: login com credenciais corretas/incorretas (toast de erro correto), logout redireciona para `/login`, acesso não-autenticado a rota protegida redireciona com `?redirect=` e volta à rota original após login.
- **Dashboard**: stat cards, lista "Precisam de atenção" com navegação para o aluno, CTA "Novo aluno".
- **Lista de alunos**: busca por nome (case-insensitive, ao vivo), filtros Ativos/Arquivados/Todos, avatares com iniciais, badges de status coloridos.
- **CRUD de aluno**: criação com validação de campos obrigatórios, consentimento LGPD registrado com data correta, edição de dados salva corretamente, Arquivar/Reativar via menu ⋮ funcionam e refletem no badge de status.
- **Avaliação/anamnese**: registrar condição/patologia, criar avaliação inicial completa (queixa, EVA de dor, anamnese, avaliação postural, testes físicos) — tudo persistido e exibido corretamente.
- **Sessões**: registrar sessão manual com exercício do catálogo (organizado por aparelho), séries/reps/observações.
- **Import de documentos**: upload em lote (PDF + DOCX + PNG) e "Colar texto", com extração de texto correta para `.txt`/`.docx`/`.pdf` nativo (ver achado #3 para o caso de imagem).
- **Evolução**: gráficos (recharts) de sessões por mês, registro de medida corporal (peso/altura/cintura) refletido na tabela.
- **Base de Conhecimento**: listagem dos ~36 documentos seed com contagem de trechos indexados; upload de material próprio com termo de licença (ver achado #6 para a limitação de processamento).
- **Configurações**: edição de perfil (nome/estúdio/CREFITO) salva corretamente; exportação de dados do aluno (LGPD) funciona; página de Política de Privacidade renderiza corretamente.

## Observações sobre o ambiente de teste

- QStash e Tavily não estão configurados no `.env.local` local — comportamento esperado documentado no projeto, mas que **na prática desabilita toda IA** (achado #1). Corrigir o achado #1 é o item de maior prioridade antes de qualquer outro teste ou uso real do produto.
- Testes de upload usaram arquivos sintéticos gerados para este QA (PDF/DOCX/PNG mínimos válidos) — suficientes para validar o pipeline de extração de texto, mas a imagem não representa uma ficha real fotografada (ver ressalva no achado #3).
- Não foram testadas ações destrutivas de conta (alterar senha, excluir conta) nem responsividade mobile real (a ferramenta de resize de viewport não surtiu efeito nesta sessão) — fora do escopo por segurança/limitação de ferramenta, não por decisão de produto.
