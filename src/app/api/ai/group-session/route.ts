import { streamObject } from "ai";
import { NextResponse } from "next/server";
import { openrouter } from "@/lib/ai/client";
import { buildDossieColetivo } from "@/lib/ai/dossie-coletivo";
import { getModeloParaFeature } from "@/lib/ai/preferencias";
import { aulaColetivaSystemPrompt } from "@/lib/ai/prompts/aula-coletiva";
import { validaRotacao } from "@/lib/ai/rotacao";
import { planoAulaGrupoSchema } from "@/lib/ai/schemas/plano-aula-grupo";
import { assertQuota, logUsage, mapAiError, QuotaError } from "@/lib/ai/usage";
import { createClient } from "@/lib/supabase/server";
import { listEstacoesAtivas } from "@/server/aparelhos";
import { requireTenant } from "@/server/auth";
import { listAlunosDaTurma } from "@/server/turmas";

export const runtime = "nodejs";
export const maxDuration = 300;

const REPORT_TYPE = "group_session";

/**
 * Gera o plano de uma AULA COLETIVA (turma) com rotação de aparelhos, em
 * STREAMING (NDJSON). Espelha /api/ai/next-session. Ver o cliente em
 * src/components/turmas/gerar-plano-coletivo.tsx.
 *
 * Eventos: {type:"stage",stage} · {type:"partial",foco,blocos[]} ·
 *          {type:"done",id,avisos?} · {type:"error",erro}
 *
 * Bloqueia (400) se a turma não tiver alunas ou se houver mais alunas que
 * estações ativas (a rotação sem compartilhamento exige alunos ≤ estações).
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { classSessionId?: string };
  if (!body.classSessionId)
    return NextResponse.json({ erro: "classSessionId ausente" }, { status: 400 });

  const ctx = await requireTenant();
  const supabase = await createClient();
  const classSessionId = body.classSessionId;

  const modelo = await getModeloParaFeature(ctx.user.id, "relatorio");

  try {
    await assertQuota(ctx.tenant.id);
  } catch (e) {
    if (e instanceof QuotaError) return NextResponse.json({ erro: e.message }, { status: 402 });
    throw e;
  }

  // Ocorrência da turma (RLS garante o escopo do tenant).
  const { data: sessao } = await supabase
    .from("class_sessions")
    .select("id, class_group_id, session_date, start_time, duration_min")
    .eq("id", classSessionId)
    .maybeSingle();
  if (!sessao) return NextResponse.json({ erro: "Aula não encontrada." }, { status: 404 });

  // Pré-validação: alunas vs estações ativas (antes do dossiê custoso).
  const [alunos, estacoes] = await Promise.all([
    listAlunosDaTurma(sessao.class_group_id),
    listEstacoesAtivas(),
  ]);
  if (alunos.length < 1)
    return NextResponse.json(
      { erro: "Esta turma não tem alunas para montar o plano." },
      { status: 400 },
    );
  if (alunos.length > estacoes.length)
    return NextResponse.json(
      {
        erro: `A turma tem ${alunos.length} alunas, mas só ${estacoes.length} estação(ões) ativa(s). A rotação sem compartilhar aparelhos exige no máximo tantas alunas quanto estações. Cadastre mais aparelhos ou reduza a turma.`,
      },
      { status: 400 },
    );

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (obj: unknown) => controller.enqueue(enc.encode(`${JSON.stringify(obj)}\n`));

      let reportId: string | null = null;
      try {
        const dossie = await buildDossieColetivo({
          tenantId: ctx.tenant.id,
          classGroupId: sessao.class_group_id,
          classSessionId,
          date: sessao.session_date,
          startTime: sessao.start_time,
          durationMin: sessao.duration_min,
          onEtapa: (etapa) => send({ type: "stage", stage: etapa }),
        });

        // Reserva a linha (idempotência por input_hash — partial unique group).
        const { data: row } = await supabase
          .from("ai_reports")
          .insert({
            tenant_id: ctx.tenant.id,
            student_id: null,
            class_session_id: classSessionId,
            report_type: REPORT_TYPE,
            period_start: null,
            period_end: sessao.session_date,
            input_hash: dossie.inputHash,
            status: "processing",
            model: modelo,
            input_snapshot: dossie.snapshot as never,
            requested_by: ctx.user.id,
          })
          .select("id")
          .single();

        if (row) {
          reportId = row.id;
        } else {
          const { data: existente } = await supabase
            .from("ai_reports")
            .select("id, status")
            .eq("tenant_id", ctx.tenant.id)
            .eq("report_type", REPORT_TYPE)
            .eq("class_session_id", classSessionId)
            .eq("input_hash", dossie.inputHash)
            .maybeSingle();
          if (existente?.status === "completed" || existente?.status === "processing") {
            send({ type: "done", id: existente.id, cached: true });
            controller.close();
            return;
          }
          if (!existente) {
            send({ type: "error", erro: "Não foi possível iniciar." });
            controller.close();
            return;
          }
          reportId = existente.id;
          await supabase
            .from("ai_reports")
            .update({ status: "processing", error_message: null })
            .eq("id", reportId);
        }

        send({ type: "stage", stage: "gerando" });
        const provider = openrouter();
        const result = streamObject({
          model: provider.chat(modelo),
          schema: planoAulaGrupoSchema,
          system: aulaColetivaSystemPrompt({ numEstacoes: dossie.estacoes.length }),
          prompt: dossie.promptUser,
          maxOutputTokens: 6000,
          abortSignal: AbortSignal.timeout(120_000),
        });

        for await (const parcial of result.partialObjectStream) {
          const blocos = (parcial.blocos ?? []).map((b) => ({
            ordem: b?.ordem ?? null,
            atribuicoes: (b?.atribuicoes ?? [])
              .map((a) => ({
                aluno: a?.aluno_rotulo ?? "",
                estacao: a?.estacao_rotulo ?? "",
                exercicio: a?.exercicio ?? "",
              }))
              .filter((a) => a.aluno || a.estacao),
          }));
          send({ type: "partial", foco: parcial.foco ?? "", blocos });
        }

        const object = await result.object;
        const usage = await result.usage;

        // Validação de rotação (avisar, não regenerar).
        const rot = validaRotacao(
          object,
          dossie.alunos,
          dossie.estacoes,
          dossie.catalogoPorAparelho,
        );

        if (!rot.ok) {
          // Mantém o structured para revisão manual, mas marca como falha.
          await supabase
            .from("ai_reports")
            .update({
              status: "failed",
              structured: object as never,
              usage: usage as never,
              error_message: rot.erros.join(" "),
              completed_at: new Date().toISOString(),
            })
            .eq("id", reportId);
          // Liga mesmo em falha: a profissional pode abrir o board e revisar/ajustar.
          await supabase
            .from("class_sessions")
            .update({ plan_report_id: reportId })
            .eq("id", classSessionId);
          await logUsage({
            tenantId: ctx.tenant.id,
            userId: ctx.user.id,
            kind: "report",
            model: modelo,
            usage,
            metadata: {
              reportId,
              feature: "group_session",
              classSessionId,
              numAlunos: dossie.alunos.length,
              rotacaoFalhou: true,
            },
          });
          send({
            type: "error",
            erro: `O plano foi gerado mas a rotação tem problemas: ${rot.erros.join(" ")}. Abra "Ver plano" para revisar.`,
          });
          return;
        }

        await supabase
          .from("ai_reports")
          .update({
            status: "completed",
            structured: object as never,
            usage: usage as never,
            completed_at: new Date().toISOString(),
          })
          .eq("id", reportId);

        // Liga a ocorrência ao plano.
        await supabase
          .from("class_sessions")
          .update({ plan_report_id: reportId })
          .eq("id", classSessionId);

        await logUsage({
          tenantId: ctx.tenant.id,
          userId: ctx.user.id,
          kind: "report",
          model: modelo,
          usage,
          metadata: {
            reportId,
            feature: "group_session",
            classSessionId,
            numAlunos: dossie.alunos.length,
          },
        });

        send({ type: "done", id: reportId, avisos: rot.avisos.length ? rot.avisos : undefined });
      } catch (err) {
        const amigavel = mapAiError(err);
        if (reportId) {
          await supabase
            .from("ai_reports")
            .update({ status: "failed", error_message: amigavel.message })
            .eq("id", reportId);
        }
        send({ type: "error", erro: amigavel.message });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
