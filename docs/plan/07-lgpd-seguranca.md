# LGPD e Segurança

> Parte do planejamento do FisioPilates — ver 00-visao-geral.md.

Os dados que o FisioPilates trata são, na maioria, **dados pessoais sensíveis de saúde** (LGPD, Lei 13.709/2018, art. 5º, II e art. 11). Isso muda o peso de cada decisão: consentimento, residência de dados no Brasil, isolamento entre profissionais e minimização do que chega à IA deixam de ser "boas práticas" e viram requisitos de primeira classe.

Este documento define os papéis LGPD (quem é controladora, quem é operador, quem são os suboperadores), a base legal e o registro de consentimento, a fronteira entre a base de conhecimento técnica e os dados de aluno, as regras de pseudonimização que precisam existir **como código** (não como convenção), a residência de dados, os direitos do titular (exportação e exclusão em duas fases), o que é auditado, as camadas de controle de acesso e um checklist de conformidade fase a fase.

Os controles técnicos que sustentam tudo isto — RLS, políticas de Storage, `service_role` — estão descritos em detalhe em `02-banco-de-dados.md`; a camada de IA, em `04-ia.md`; a infraestrutura de residência, em `06-infra-deploy.md`. Aqui olhamos para os mesmos mecanismos pela lente da conformidade.

---

## 1. Papéis LGPD

A cadeia de tratamento tem três camadas. Deixá-las explícitas orienta contratos, política de privacidade e o termo de consentimento.

| Papel | Quem | Responsabilidade |
|---|---|---|
| **Controladora** | A **fisioterapeuta** (dona do tenant) | Decide quais dados coleta de cada aluno, para qual finalidade e por quanto tempo. É ela quem tem a relação clínica com o titular e o dever de guarda do prontuário. |
| **Operadora** | A **plataforma FisioPilates** | Trata os dados **em nome da** profissional, seguindo as finalidades que ela define. Hospeda, isola por tenant, processa (RAG/IA) e disponibiliza os direitos do titular. |
| **Suboperadores** | **OpenRouter/Anthropic** (LLM e embeddings), **Tavily** (busca web), **Upstash/QStash** (fila de ingestão), **Supabase** (banco, Auth, Storage), **Vercel** (hospedagem) | Prestadores contratados pela operadora que tratam dados sob instrução. Cada um deve estar documentado na política de privacidade e no termo. |

Consequências práticas dessa divisão:

- **A profissional é sempre a decisora final.** A plataforma nunca apaga, exporta ou compartilha dados de aluno por conta própria — sempre por uma ação disparada pela controladora. O caso mais delicado é a exclusão a pedido do titular versus o dever de guarda profissional (ver §7.3).
- **A plataforma responde pela segurança do tratamento.** Isolamento entre tenants, criptografia, minimização e a escolha de suboperadores confiáveis são deveres do operador — daí o rigor de RLS e de `data_collection: 'deny'`.
- **Todo suboperador precisa de base contratual.** DPA do Supabase assinado (disponível no dashboard); política de dados do OpenRouter configurada para não retenção; termos da Tavily e da Upstash aceitos. A lista de suboperadores é parte da transparência devida ao titular.

---

## 2. Base legal e consentimento

### 2.1 Base legal

O tratamento de dados de saúde por profissional de saúde ampara-se na **tutela da saúde** (art. 11, II, "f" — procedimento realizado por profissional de saúde). Mesmo assim, **registramos consentimento explícito** do aluno, por dois motivos: reforça a transparência exigida pela LGPD e cobre a comunicação a suboperadores (o envio de dados clínicos, ainda que pseudonimizados, à IA precisa estar previsto no termo que o aluno assina).

### 2.2 Registro de consentimento

O consentimento vive na própria linha do aluno, não em uma tabela à parte:

```sql
-- em public.students
consent_signed_at   timestamptz,   -- quando o aluno consentiu
consent_version     text,          -- versão do termo aceito (ex.: '2026-07-v1')
consent_document_id uuid           -- FK para o termo assinado (documents), escaneado/anexado
```

- **`consent_version`** carimba **qual** texto de termo o aluno aceitou. Quando o termo mudar (nova finalidade, novo suboperador), a versão muda; alunos antigos continuam com a versão que assinaram, o que dá rastreabilidade de "quem consentiu com o quê".
- **O termo assinado é um documento**, não só um flag. A profissional anexa o PDF/foto do termo físico assinado pelo aluno ao `student-documents` (bucket privado, `kind='consent_form'`) e a `students.consent_document_id` aponta para essa linha em `documents`. O booleano por si só não é prova; o documento é.
- O registro é gravado no cadastro do aluno (Fase 2) e a criação/consulta desse documento entra em `audit_logs`.

### 2.3 Consentimento bloqueante para IA

O consentimento **bloqueia a geração de relatórios de IA e a análise postural**: sem `consent_signed_at` preenchido para o aluno, o builder de dossiê recusa a operação com mensagem clara em pt-BR ("Registre o consentimento do aluno antes de gerar análises com IA"). Isso é regra de código no caminho de `POST /api/ai/analyses`, verificada **antes** de montar qualquer contexto — não é apenas um aviso na UI. O motivo: gerar relatório envia dados clínicos a um suboperador (OpenRouter/Anthropic), e essa comunicação precisa estar coberta pelo consentimento que o aluno assinou.

---

## 3. Dados sensíveis de saúde e minimização

Praticamente tudo que gira em torno do aluno é dado sensível: avaliações, condições/patologias (com CID-10 opcional), níveis de dor (EVA), medidas corporais, fotos posturais, exames anexados. O princípio da **minimização** (art. 6º, III) aparece em três lugares:

1. **Coleta enxuta no cadastro.** CPF, e-mail e telefone do aluno são **opcionais**. Só se coleta o que a ficha clínica realmente exige; identificadores diretos não são obrigatórios para o produto funcionar.
2. **Minimização no prompt da IA** — o que chega ao suboperador de IA é o mínimo clinicamente necessário: dados clínicos sim, identificadores diretos não. Isto é a pseudonimização da §4.
3. **Minimização na busca web** — a query enviada à Tavily é montada **apenas com termos técnicos** (patologia, exercício, objetivo), nunca com nome, idade ou qualquer identificador do aluno (ver §4.2).

Dado sensível nunca vira URL pública: documentos e fotos só saem do Storage por signed URL de curta duração gerada no servidor (ver §8.3).

---

## 4. Pseudonimização — regra de código, não convenção

Este é o controle LGPD mais importante do produto e a razão de ser tratado como **arquitetura**, não como recomendação. Antes de qualquer dado de aluno atravessar a fronteira para um suboperador de IA, ele passa por pseudonimização. "Regra de código" significa: a pseudonimização acontece dentro do próprio builder de dossiê e do builder de query, de forma que **não existe caminho** que envie o dado bruto — não depende de o desenvolvedor "lembrar de tirar o nome".

### 4.1 No builder de dossiê (relatórios e análise postural)

O builder de dossiê server-side (Fase 6), que monta o contexto de avaliações + condições + sessões + medidas + `extracted_text` de documentos + chunks de RAG, produz sua saída **já pseudonimizada**:

- **Substitui o nome do aluno** por um rótulo neutro ("Aluna A", iniciais ou identificador interno) em todo o texto que vai ao prompt.
- **Omite CPF, telefone, e-mail e contato de emergência** — nenhum identificador direto entra no prompt.
- Mantém os **dados clínicos** (queixa, objetivos, condições, EVA, medidas, exercícios, cargas), que são o que a análise precisa e não identificam a pessoa por si sós.

A garantia arquitetural: a função que serializa o dossiê é a **única** fonte do contexto enviado à IA, e ela pseudonimiza na saída. O endpoint de IA nunca recebe o objeto `student` cru — recebe o dossiê já tratado. Fotos posturais (dado sensível de corpo) seguem a mesma lógica: entram como signed URLs curtas (5 min), emparelhadas apenas com metadado de vista e data ("Foto 1: vista anterior, 12/03/2026"), sem nome no rótulo.

### 4.2 No builder de query web

O acionamento da Tavily (§ RAG) usa um **builder de query separado** que constrói a busca só com termos técnicos. Ele nunca recebe o objeto do aluno — recebe patologia/exercício/objetivo já extraídos. Isso é o mesmo princípio da §4.1 aplicado à outra fronteira de saída.

### 4.3 Configuração do suboperador de IA

Além de pseudonimizar, restringimos o comportamento do suboperador no próprio request ao OpenRouter:

```ts
provider: { data_collection: 'deny' }   // só roteia para provedores que não retêm/treinam com os dados
```

Combinado com o fallback pinado e o `usage: { include: true }`, isso mantém o tratamento restrito a provedores sem retenção. E, por política de produto, **a IA nunca é exposta ao aluno final** — só à profissional —, o que reduz drasticamente a superfície de risco.

### 4.4 Logs de uso sem conteúdo clínico

`ai_usage_log` registra **métricas** (tenant, `kind`, modelo, tokens, custo, `generation_id` em `metadata`), nunca o conteúdo do prompt ou da resposta. O dado clínico não é replicado no log de uso.

---

## 5. Fronteira entre KB técnica e dados de aluno

Esta separação é uma **regra de arquitetura de conformidade** (decisão vinculante do projeto) e não deve ser relaxada sem revisão de LGPD.

- A **base de conhecimento (`kb_documents`/`kb_chunks`)** cobre **três escopos** (coluna `scope`): `global` (conhecimento técnico compartilhado entre tenants, só leitura), `tenant` (material do tenant) e `student` (anexos do próprio aluno — ver abaixo). Todo o conteúdo é **vetorizado** e indexado para busca semântica; a base global é compartilhada entre todos os tenants (somente leitura).
- Os **documentos de aluno** (exames, fotos posturais, laudos, termos) vivem em outro bucket (`student-documents`) e outra tabela (`documents`), com RLS estrita por tenant. O texto extraído (campo `documents.extracted_text`, pipeline `unpdf` no upload) também é **vetorizado e ingerido em `kb_chunks`** com `scope='student'` + `student_id` (migration 0027), para a IA usar no plano de aula coletivo e no chat daquele aluno. O vínculo volta à `documents` via `documents.kb_document_id` (cascade apaga os chunks ao excluir o documento).

A separação entre escopos é garantida **por construção** na função `match_kb_chunks` (security invoker, RLS): um chunk `scope='student'` **só** é retornado quando a chamada passa `p_student_id` igual ao `student_id` do chunk **e** o `p_tenant_id` bate com o tenant do requisitante. Em buscas sem `p_student_id` (relatório individual do próprio aluno, dossiê coletivo sem aquele aluno), chunks de aluno **não aparecem**; a base global/tenant é filtrada por `tenant_id in user_tenant_ids()`. Assim, dado de saúde de um aluno **jamais** é recuperado por outro tenant ou pela base global — a fronteira é `scope + student_id + tenant_id`, não física.

**Risco residual e mitigação:** ao contrário da fronteira física original (tabela separada), a separação por scope+RLS depende da corretude da `match_kb_chunks` e das policies. Mitigações: (a) a query RAG usa **só termos técnicos** (nomes de condições, não dados identificáveis), (b) a injeção no prompt é **por pseudônimo** (§3, §4), (c) `data_collection: 'deny'` no OpenRouter, (d) chunks de aluno herdam a retenção/exclusão dos `documents` (cascade via `kb_document_id`). **Alternativa mais forte** se a fronteira por scope vier a ser considerada insuficiente: migrar para uma tabela separada `student_doc_chunks` (`tenant_id + student_id`, RLS própria, função de match dedicada) — decisão adiada; a estrutura atual (`scope='student'` + `student_id` + índice `kb_chunks_student_idx`) facilita essa migração futura sem reembeddar.

---

## 6. Residência de dados

Toda a superfície de dados fica em **território brasileiro** — decisão de latência e, sobretudo, de residência de dados de saúde:

- **Banco, Auth e Storage:** projeto Supabase na região **`sa-east-1` (São Paulo)**. Criptografia at rest e in transit são default do Supabase; **DPA do Supabase assinado** (disponível no dashboard).
- **Runtime de aplicação:** funções da Vercel fixadas na região **`gru1` (São Paulo)** via `vercel.json`, mantendo o processamento no Brasil e o RTT app ↔ banco em ~1–5 ms (ver `06-infra-deploy.md`).
- **Suboperadores fora do Brasil** (OpenRouter/Anthropic, Tavily) recebem apenas dados **pseudonimizados e minimizados** (§3, §4) e sob `data_collection: 'deny'`. A transferência internacional que ocorre é a do mínimo necessário, coberta pelo consentimento e documentada no termo.
- **Previews nunca rodam contra produção.** O ambiente de preview da Vercel usa um **projeto Supabase de staging** separado; dados reais de produção jamais são expostos a builds de preview (ver `06-infra-deploy.md`).

---

## 7. Direitos do titular

Implementados na Fase 8. A profissional (controladora) é quem opera esses fluxos pela UI; a plataforma fornece as ferramentas.

### 7.1 Acesso e portabilidade (art. 18, II e V)

- **Exportar dados do aluno:** pacote com ficha, avaliações, condições, sessões, medidas e relatórios de IA em **JSON** (estruturado, para portabilidade) e **PDF** (legível), mais um **zip dos documentos** do Storage do aluno.
- **Exportar o tenant completo:** para offboarding da profissional — todos os dados de todos os seus alunos num único pacote.

Toda exportação gera linha em `audit_logs`.

### 7.2 Exclusão em duas fases (art. 18, VI)

A exclusão de aluno é **soft delete imediato + hard delete diferido**, para dar janela de arrependimento e permitir recuperação de exclusão acidental:

1. **Fase 1 — soft delete (imediato):** grava `students.deleted_at = now()`. O aluno some da UI na hora; nada é destruído fisicamente ainda.
2. **Fase 2 — hard delete (após 30 dias):** a função `private.erase_student(student_id)` apaga em cascata as linhas relacionadas **e faz purge dos objetos do Storage** do aluno (prefixo `{tenant_id}/{student_id}/`), gravando `audit_logs('student.erase')`. O purge de Storage é explícito: apagar a linha em `documents` não remove o binário — é preciso deletar o objeto **antes** (ou logo após) apagar a linha.

A exclusão de **conta** (tenant inteiro) segue o mesmo espírito com double-confirm: cascata total via FKs `on delete cascade` + purge de Storage por prefixo `{tenant_id}/`. As sessões Auth são revogadas antes; como tokens JWT continuam válidos até expirar, mantemos o expiry curto (~1h).

### 7.3 Dever de guarda COFFITO — o conflito legal

Há uma **tensão real** entre o direito de exclusão do titular e o **dever de guarda profissional**: prontuários fisioterapêuticos têm retenção plurianual orientada por COFFITO/CFM. A resolução do produto:

- A exclusão a pedido do titular é uma **decisão informada da controladora** — a profissional. A UI **mostra um aviso explícito** sobre o dever de guarda antes de confirmar qualquer exclusão de aluno ou de dados clínicos.
- A plataforma **não decide** por ela: fornece o botão e o alerta; a responsabilidade legal pela retenção ou exclusão é da profissional.
- O mesmo aviso aparece no fluxo de exclusão de conta.

Este é um risco regulatório reconhecido do produto (interpretação de responsabilidade profissional) — mitigado por manter a decisão nas mãos da controladora e por deixar o aviso permanente no fluxo.

---

## 8. Segurança de acesso

A conformidade LGPD depende de os controles de acesso funcionarem. O detalhamento técnico está em `02-banco-de-dados.md`; aqui, o essencial para conformidade.

### 8.1 RLS em 100% das tabelas

Row Level Security habilitado em **todas** as tabelas do schema `public`, com policies `TO authenticated` e predicado de posse (`tenant_id in (select private.user_tenant_ids())`). Isolamento cross-tenant é o **pior cenário do produto** — dado de saúde de aluna de uma profissional visto por outra. Mitigação:

- Template de 4 policies (SELECT/INSERT/UPDATE/DELETE) em toda tabela de domínio; UPDATE com `USING` **e** `WITH CHECK` para impedir reatribuir `tenant_id`.
- **Testes automatizados de isolamento desde a Fase 1** — duas usuárias não se enxergam, provado por teste SQL/E2E.
- `supabase db advisors` rodado após **cada** migration com RLS/função/view (pega tabela sem RLS, view sem `security_invoker`, função sem `search_path`).

### 8.2 `service_role` — bypass de RLS sob controle

A `service_role` key **bypassa RLS** e só é usada server-side, em pipelines (ingestão de KB, builder de dossiê). Regras:

- A key vive **apenas** em env vars server-side da Vercel — **nunca** `NEXT_PUBLIC_*`. O front usa somente a publishable key.
- Todo código que usa `service_role` **deve filtrar `tenant_id` manualmente** (`eq('tenant_id', …)`), já que a RLS não o protege. Preferir sempre o client autenticado (com RLS ativa) e reservar `service_role` para o que não dá outro jeito.
- **Checklist da Fase 8:** `grep` de todo uso de `service_role` + revisão manual de que cada um tem filtro de tenant.

### 8.3 Signed URLs curtas para dados de saúde

Documentos e fotos **nunca** têm URL pública. A entrega é sempre por **signed URL de curta duração** gerada no servidor:

- **60–300 s** para download de documento pela profissional; **5 min** para fotos passadas como content parts à IA na análise postural.
- O upload é o inverso: signed **upload** URL gerada no servidor, PUT direto do browser — o binário **nunca passa pela função serverless**.
- Todo **download** de documento gera linha em `audit_logs`.

### 8.4 Captcha e sessões

- **Turnstile (captcha)** no cadastro, para conter criação automatizada de contas (Fase 8).
- **Expiry de token curto (~1h)** — reduz a janela em que um JWT continua válido após revogação de sessão (relevante no encerramento de conta, §7.2).
- Autorização **nunca** via `user_metadata` (editável pelo usuário); membership vive em `tenant_members`, resolvido por `private.user_tenant_ids()`.

---

## 9. Auditoria (`audit_logs`)

A tabela `audit_logs` é **imutável para usuários** — insert-only, sem policies de UPDATE/DELETE. Registra o essencial para LGPD (quem fez o quê, quando, sobre qual entidade) sem armazenar conteúdo clínico.

```sql
create table public.audit_logs (
  id          bigint generated always as identity primary key,
  tenant_id   uuid not null,
  user_id     uuid,
  action      text not null,       -- 'student.create','document.download','student.erase',...
  entity_type text not null,
  entity_id   uuid,
  metadata    jsonb not null default '{}',
  created_at  timestamptz not null default now()
);
```

**O que auditar** (mínimo):

| Evento | `action` | Por quê |
|---|---|---|
| Criação/exclusão de aluno | `student.create` / `student.delete` | Ciclo de vida do titular. |
| Hard delete de aluno | `student.erase` | Prova de que o direito de exclusão foi cumprido (com purge). |
| Upload/download/exclusão de documento | `document.upload` / `document.download` / `document.delete` | Acesso a dado de saúde bruto; download é o evento mais sensível. |
| Registro de consentimento | `consent.record` | Prova de base legal. |
| Geração de relatório de IA | `ai_report.generate` | Rastreia envio de contexto a suboperador. |
| Exportação de dados | `student.export` / `tenant.export` | Cumprimento de acesso/portabilidade. |

`metadata` guarda contexto não sensível (ex.: `{ "document_kind": "exam" }`), nunca o conteúdo do arquivo ou do prompt. O relatório de IA guarda separadamente, em `ai_reports.input_snapshot`, os **IDs** das entradas usadas — rastreabilidade sem duplicar dado clínico.

---

## 10. Checklist de conformidade por fase

Cada fase termina deployada e testável; os itens de conformidade abaixo são gates dessa entrega.

**Fase 0 — Infra**
- [ ] Supabase em `sa-east-1`; Vercel em `gru1`; DPA do Supabase assinado.
- [ ] `service_role` key só em env server-side; publishable key no front. Nenhum segredo em `NEXT_PUBLIC_*`.
- [ ] Projeto Supabase de staging separado para previews (produção nunca exposta a preview).
- [ ] `private.user_tenant_ids()` e RLS de tenancy no lugar; advisors sem findings críticos.

**Fase 1 — Auth e onboarding**
- [ ] Aceite LGPD no cadastro da profissional.
- [ ] RLS de `tenants`/`profiles`/`tenant_members` com **teste automatizado de isolamento** (usuária A não lê tenant de B).
- [ ] Expiry de token curto (~1h) configurado.

**Fase 2 — Alunos**
- [ ] Registro de consentimento (`consent_signed_at`/`consent_version`) no cadastro do aluno.
- [ ] Minimização: CPF/e-mail/telefone do aluno opcionais.
- [ ] Soft delete (`deleted_at`) com aviso LGPD no ConfirmDialog.
- [ ] `audit_logs` em create/delete de aluno.

**Fase 4 — Documentos e Storage**
- [ ] Buckets privados; policies de `storage.objects` por prefixo de tenant.
- [ ] Download só por signed URL curta; upload direto por signed upload URL (binário fora da função).
- [ ] `audit_logs` em upload/download/exclusão de documento.
- [ ] Upload do termo de consentimento assinado vinculado ao aluno (`consent_document_id`).

**Fase 5 — RAG**
- [ ] Escrita de `kb_chunks` só por `service_role`; SELECT global-ou-tenant.
- [ ] Fronteira KB × dado de aluno respeitada (§5): chunk `scope='student'` só retorna quando `p_student_id` bate e dentro do tenant; nunca aparece em busca global/tenant-only.
- [ ] Teste: chunk de tenant A nunca aparece para B; chunk `scope='student'` do aluno X nunca aparece sem `p_student_id=X`.
- [ ] Builder de query web só com termos técnicos (§4.2).

**Fase 6 — Relatórios de IA**
- [ ] **Pseudonimização no builder de dossiê** verificada (sem nome/CPF/contato no prompt) — regra de código, com teste.
- [ ] Consentimento **bloqueante** para gerar relatório.
- [ ] `data_collection: 'deny'` no request ao OpenRouter.
- [ ] Relatório nasce rascunho → aprovação humana; banner de disclaimer permanente.
- [ ] `ai_usage_log` sem conteúdo clínico; `input_snapshot` com IDs, não conteúdo.
- [ ] `audit_logs` em geração de relatório.

**Fase 7 — Chat**
- [ ] `buscar_ficha_aluno` isolado por RLS (só alunos do próprio tenant).
- [ ] Pseudonimização mantida no contexto do chat; `data_collection: 'deny'`.
- [ ] Disclaimer permanente na UI do assistente.

**Fase 8 — LGPD completo e hardening**
- [ ] Exportação de dados do aluno (JSON/PDF + zip) e do tenant completo.
- [ ] `private.erase_student()` em duas fases (soft 30 dias → hard delete + purge de Storage), com aviso de dever de guarda COFFITO na UI.
- [ ] Exclusão de conta (double-confirm, cascata + purge de Storage por prefixo).
- [ ] Política de privacidade + termo de consentimento modelo publicados, citando OpenRouter/Anthropic/Tavily/Upstash como suboperadores.
- [ ] Captcha Turnstile no cadastro.
- [ ] Revisão de **todo** uso de `service_role` (grep + checklist de filtro de tenant).
- [ ] `supabase db advisors` limpo (zero findings críticos).

---

## 11. Resumo dos riscos LGPD e mitigações

| Risco | Gravidade | Mitigação |
|---|---|---|
| **Vazamento cross-tenant** (dado de saúde de aluna de A visto por B) | Crítico | RLS em 100% das tabelas + policies de Storage por prefixo; `service_role` só em pipelines com filtro de tenant revisado (checklist Fase 8); testes de isolamento desde a Fase 1; advisors a cada migration. |
| **Dado sensível enviado à IA sem tratamento** | Crítico / legal | Pseudonimização obrigatória no builder de dossiê (regra de código, não convenção); `data_collection: 'deny'`; residência `sa-east-1`; consentimento bloqueante; suboperadores documentados; previews nunca contra produção. |
| **Dado de aluno indexado na KB** | Crítico | Fronteira §5: chunk `scope='student'` em `kb_chunks` só é recuperado pela `match_kb_chunks` quando `p_student_id` bate e dentro do tenant (`security invoker`, RLS); nunca aparece em busca global/tenant-only. Query RAG só com termos técnicos; injeção por pseudônimo; `data_collection: 'deny'`; cascade de exclusão via `kb_document_id`. Alternativa de tabela separada (`student_doc_chunks`) mantida como evolução se a fronteira por scope for insuficiente. |
| **Exclusão × dever de guarda COFFITO** | Médio / legal | Decisão informada da controladora; aviso explícito na UI antes de confirmar; plataforma não decide pela profissional. |
| **Identificador direto na busca web** | Alto | Builder de query separado, só termos técnicos; regra de código (§4.2). |
