import { generateObject } from "ai";
import { NextResponse } from "next/server";
import { MODELS, openrouter } from "@/lib/ai/client";
import { buildDossie } from "@/lib/ai/dossie";
import { analiseSystemPrompt } from "@/lib/ai/prompts/analise-evolucao";
import { relatorioSchema } from "@/lib/ai/schemas/relatorio";
import { assertQuota, logUsage, mapAiError, QuotaError, withRetry } from "@/lib/ai/usage";
import { createClient } from "@/lib/supabase/server";
import { requireTenant } from "@/server/auth";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: Request) {
  const body = (await req.json()) as {
    studentId?: string;
    from?: string | null;
    to?: string | null;
    reportType?: string;
  };
  if (!body.studentId) return NextResponse.json({ erro: "studentId ausente" }, { status: 400 });
  const reportType = body.reportType ?? "full_evolution";
  const period = { from: body.from ?? null, to: body.to ?? null };

  const ctx = await requireTenant();
  const supabase = await createClient();

  try {
    await assertQuota(ctx.tenant.id);
  } catch (e) {
    if (e instanceof QuotaError) return NextResponse.json({ erro: e.message }, { status: 402 });
    throw e;
  }

  const dossie = await buildDossie({ tenantId: ctx.tenant.id, studentId: body.studentId, period });

  // Reserva a linha; a constraint única dá cache/idempotência e barra duplo clique.
  const { data: row, error: insErr } = await supabase
    .from("ai_reports")
    .insert({
      tenant_id: ctx.tenant.id,
      student_id: body.studentId,
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
    // Conflito de unique → já existe relatório para este dossiê (cache/em processamento).
    const { data: existente } = await supabase
      .from("ai_reports")
      .select("id, status")
      .eq("tenant_id", ctx.tenant.id)
      .eq("student_id", body.studentId)
      .eq("report_type", reportType)
      .eq("input_hash", dossie.inputHash)
      .maybeSingle();
    if (existente) {
      return NextResponse.json({ id: existente.id, status: existente.status, cached: true });
    }
    return NextResponse.json({ erro: "Não foi possível iniciar a análise." }, { status: 500 });
  }

  try {
    const provider = openrouter();
    const { object, usage } = await withRetry(() =>
      generateObject({
        model: provider.chat(MODELS.main()),
        schema: relatorioSchema,
        system: analiseSystemPrompt(),
        prompt: dossie.promptUser,
        maxOutputTokens: 4000,
        abortSignal: AbortSignal.timeout(120_000),
      }),
    );

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
      model: MODELS.main(),
      usage,
      metadata: { reportId: row.id },
    });

    return NextResponse.json({ id: row.id, status: "completed" });
  } catch (err) {
    const amigavel = mapAiError(err);
    await supabase
      .from("ai_reports")
      .update({ status: "failed", error_message: amigavel.message })
      .eq("id", row.id);
    return NextResponse.json({ erro: amigavel.message }, { status: 502 });
  }
}
