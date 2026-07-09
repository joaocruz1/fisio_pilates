import { streamObject } from "ai";
import { NextResponse } from "next/server";
import { MODELS, openrouter } from "@/lib/ai/client";
import { buildDossie } from "@/lib/ai/dossie";
import { suportaFeature } from "@/lib/ai/modelos";
import { getModeloParaFeature } from "@/lib/ai/preferencias";
import { analiseSystemPrompt } from "@/lib/ai/prompts/analise-evolucao";
import { relatorioSchema } from "@/lib/ai/schemas/relatorio";
import { assertQuota, logUsage, mapAiError, QuotaError } from "@/lib/ai/usage";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/server/auth";

export const runtime = "nodejs";
export const maxDuration = 300;

type Evento =
  | { type: "stage"; stage: "dados" | "base" | "gerando" }
  | { type: "partial"; resumo: string }
  | { type: "done"; id: string; cached?: boolean; status?: string }
  | { type: "error"; erro: string };

export async function POST(req: Request) {
  const body = (await req.json()) as {
    studentId?: string;
    from?: string | null;
    to?: string | null;
    reportType?: string;
  };
  if (!body.studentId) return NextResponse.json({ erro: "studentId ausente" }, { status: 400 });
  const studentId = body.studentId;
  const reportType = body.reportType ?? "full_evolution";
  const period = { from: body.from ?? null, to: body.to ?? null };

  const ctx = await requireTenant();
  const supabase = await createClient();

  // Quota antes do stream → erro amigável como JSON (402).
  try {
    await assertQuota(ctx.tenant.id);
  } catch (e) {
    if (e instanceof QuotaError) return NextResponse.json({ erro: e.message }, { status: 402 });
    throw e;
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let rowId: string | null = null;
      const send = (o: Evento) => controller.enqueue(encoder.encode(`${JSON.stringify(o)}\n`));

      try {
        // Etapas "dados" e "base" emitidas pelo próprio buildDossie.
        const dossie = await buildDossie({
          tenantId: ctx.tenant.id,
          studentId,
          period,
          onEtapa: (etapa) => send({ type: "stage", stage: etapa }),
        });

        // Reserva a linha; unique dá cache/idempotência e barra duplo clique.
        // O modelo final é resolvido depois (depende de fotos + preferência).
        // Gravamos um placeholder em `model` só pra satisfazer a coluna; o log
        // de uso é a fonte de verdade.
        const { data: row, error: insErr } = await supabase
          .from("ai_reports")
          .insert({
            tenant_id: ctx.tenant.id,
            student_id: studentId,
            report_type: reportType,
            period_start: period.from,
            period_end: period.to,
            input_hash: dossie.inputHash,
            status: "processing",
            model: MODELS.main(),
            input_snapshot: dossie.snapshot as never,
            requested_by: ctx.user.id,
          })
          .select("id")
          .single();

        if (insErr || !row) {
          const { data: existente } = await supabase
            .from("ai_reports")
            .select("id, status")
            .eq("tenant_id", ctx.tenant.id)
            .eq("student_id", studentId)
            .eq("report_type", reportType)
            .eq("input_hash", dossie.inputHash)
            .maybeSingle();
          if (existente) {
            send({ type: "done", id: existente.id, cached: true, status: existente.status });
          } else {
            send({ type: "error", erro: "Não foi possível iniciar a análise." });
          }
          controller.close();
          return;
        }
        rowId = row.id;

        // Vision: fotos posturais como content parts (signed URLs de 5 min, máx. 6).
        const fotos: URL[] = [];
        if (dossie.temFotos) {
          const { data: docs } = await supabase
            .from("documents")
            .select("bucket, storage_path")
            .eq("student_id", studentId)
            .eq("kind", "postural_photo")
            .is("deleted_at", null)
            .limit(6);
          for (const d of docs ?? []) {
            const { data } = await supabase.storage
              .from(d.bucket)
              .createSignedUrl(d.storage_path, 300);
            if (data?.signedUrl) fotos.push(new URL(data.signedUrl));
          }
        }

        send({ type: "stage", stage: "gerando" });

        const provider = openrouter();
        // Resolve modelo pela preferência da usuária. Se o relatório inclui
        // fotos posturais e o modelo não suporta vision, cai pro MODELS.main()
        // (Sonnet 5) com warning — não quebra o request.
        let modeloRelatorio = await getModeloParaFeature(ctx.user.id, "relatorio");
        if (fotos.length && !suportaFeature(modeloRelatorio, "vision")) {
          console.warn(
            `[analyses] modelo ${modeloRelatorio} não suporta vision; caindo para MODELS.main()`,
            { tenantId: ctx.tenant.id, userId: ctx.user.id },
          );
          modeloRelatorio = MODELS.main();
        }
        const baseArgs = {
          model: provider.chat(modeloRelatorio),
          schema: relatorioSchema,
          system: analiseSystemPrompt(),
          maxOutputTokens: 4000,
          abortSignal: AbortSignal.timeout(120_000),
        };
        const result = fotos.length
          ? streamObject({
              ...baseArgs,
              messages: [
                {
                  role: "user",
                  content: [
                    {
                      type: "text",
                      text: `${dossie.promptUser}\n\nAs imagens anexadas são fotos posturais. Descreva apenas achados observáveis com cautela (ângulo/iluminação podem enganar) e preencha observacoes_posturais. Nunca diagnostique.`,
                    },
                    ...fotos.map((image) => ({ type: "image" as const, image })),
                  ],
                },
              ],
            })
          : streamObject({ ...baseArgs, prompt: dossie.promptUser });

        let ultimoResumo = "";
        for await (const partial of result.partialObjectStream) {
          const resumo = partial?.resumo_executivo;
          if (resumo && resumo !== ultimoResumo) {
            ultimoResumo = resumo;
            send({ type: "partial", resumo });
          }
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
          .eq("id", row.id);

        await logUsage({
          tenantId: ctx.tenant.id,
          userId: ctx.user.id,
          kind: "report",
          model: modeloRelatorio,
          usage,
          metadata: {
            reportId: row.id,
            visionFallback: fotos.length > 0 && modeloRelatorio === MODELS.main(),
          },
        });

        send({ type: "done", id: row.id });
        controller.close();
      } catch (err) {
        const amigavel = mapAiError(err);
        if (rowId) {
          await supabase
            .from("ai_reports")
            .update({ status: "failed", error_message: amigavel.message })
            .eq("id", rowId);
        }
        send({ type: "error", erro: amigavel.message });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
    },
  });
}
