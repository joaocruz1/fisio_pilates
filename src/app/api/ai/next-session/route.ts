import { streamObject } from "ai";
import { NextResponse } from "next/server";
import { openrouter } from "@/lib/ai/client";
import { buildDossie } from "@/lib/ai/dossie";
import { getModeloParaFeature } from "@/lib/ai/preferencias";
import { proximaAulaSystemPrompt } from "@/lib/ai/prompts/proxima-aula";
import { planoAulaSchema } from "@/lib/ai/schemas/plano-aula";
import { assertQuota, logUsage, mapAiError, QuotaError } from "@/lib/ai/usage";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/server/auth";

export const runtime = "nodejs";
export const maxDuration = 300;

const REPORT_TYPE = "next_session";

/**
 * Gera o plano da próxima aula em STREAMING (NDJSON), reportando o progresso
 * REAL do pipeline ao cliente: reunir dados → consultar base → montar o plano
 * (exercícios aparecem conforme a IA os escreve). Ver o cliente em
 * src/components/sessoes/gerar-proxima-aula.tsx.
 *
 * Eventos: {type:"stage",stage} · {type:"partial",foco,exercicios[]} ·
 *          {type:"done",id} · {type:"error",erro}
 */
export async function POST(req: Request) {
  const body = (await req.json()) as { studentId?: string };
  if (!body.studentId) return NextResponse.json({ erro: "studentId ausente" }, { status: 400 });

  const ctx = await requireTenant();
  const supabase = await createClient();
  const studentId = body.studentId;

  // Resolve o modelo uma vez (reutilizado na inserção, na geração e no log).
  const modeloProximaAula = await getModeloParaFeature(ctx.user.id, "relatorio");

  try {
    await assertQuota(ctx.tenant.id);
  } catch (e) {
    if (e instanceof QuotaError) return NextResponse.json({ erro: e.message }, { status: 402 });
    throw e;
  }

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const enc = new TextEncoder();
      const send = (obj: unknown) => controller.enqueue(enc.encode(`${JSON.stringify(obj)}\n`));

      let reportId: string | null = null;
      try {
        // --- Etapas reais: reunir dados + consultar a base ---
        const today = new Date().toISOString().slice(0, 10);
        const period = { from: null, to: today };
        const dossie = await buildDossie({
          tenantId: ctx.tenant.id,
          studentId,
          period,
          forcarWeb: true,
          compact: true,
          onEtapa: (etapa) => send({ type: "stage", stage: etapa }),
        });

        // Catálogo (nomes por aparelho) para a IA escolher SOMENTE deles.
        const { data: exs } = await supabase
          .from("exercises")
          .select("name, apparatus")
          .eq("is_active", true)
          .order("apparatus")
          .order("name");
        const porAparelho = new Map<string, string[]>();
        for (const e of exs ?? []) {
          const arr = porAparelho.get(e.apparatus) ?? [];
          arr.push(e.name);
          porAparelho.set(e.apparatus, arr);
        }
        const catalogo = [...porAparelho.entries()]
          .map(([ap, nomes]) => `${ap}: ${nomes.join(", ")}`)
          .join("\n");
        const prompt = `${dossie.promptUser}\n\n<catalogo>\n${catalogo}\n</catalogo>\n\nSugira o plano da PRÓXIMA aula usando apenas exercícios do <catalogo>. Inclua pelo menos um exercício.`;

        // Reserva a linha (cache/idempotência por input_hash).
        const { data: row } = await supabase
          .from("ai_reports")
          .insert({
            tenant_id: ctx.tenant.id,
            student_id: studentId,
            report_type: REPORT_TYPE,
            period_start: period.from,
            period_end: period.to,
            input_hash: dossie.inputHash,
            status: "processing",
            model: modeloProximaAula,
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
            .eq("student_id", studentId)
            .eq("report_type", REPORT_TYPE)
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

        // --- Geração streaming: o plano é montado ao vivo ---
        send({ type: "stage", stage: "gerando" });
        const provider = openrouter();
        // Usa o modelo resolvido antes (preferência `relatorio` da usuária).
        const result = streamObject({
          model: provider.chat(modeloProximaAula),
          schema: planoAulaSchema,
          system: proximaAulaSystemPrompt(),
          prompt,
          maxOutputTokens: 4000,
          abortSignal: AbortSignal.timeout(120_000),
        });

        // Encaminha o progresso real (foco + nomes dos exercícios) conforme chega.
        for await (const parcial of result.partialObjectStream) {
          const nomes = (parcial.exercicios ?? [])
            .map((e) => e?.nome)
            .filter((n): n is string => Boolean(n));
          send({ type: "partial", foco: parcial.foco ?? "", exercicios: nomes });
        }

        const object = await result.object;
        const usage = await result.usage;

        await supabase
          .from("ai_reports")
          .update({
            status: "completed",
            structured: object as never,
            usage: usage as never,
            completed_at: new Date().toISOString(),
          })
          .eq("id", reportId);

        await logUsage({
          tenantId: ctx.tenant.id,
          userId: ctx.user.id,
          kind: "report",
          model: modeloProximaAula,
          usage,
          metadata: { reportId, feature: "next_session" },
        });

        send({ type: "done", id: reportId });
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
