import { NextResponse } from "next/server";

// Geração de relatório de evolução (síncrona, generateObject) — Fase 6.
// Ver docs/plan/04-ia.md. maxDuration alto para caber a chamada ao LLM.
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST() {
  return NextResponse.json({ erro: "Não implementado (Fase 6)." }, { status: 501 });
}
