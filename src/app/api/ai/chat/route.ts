import { NextResponse } from "next/server";

// Chat assistente com RAG (streamText + tool-calling) — Fase 7.
// Ver docs/plan/04-ia.md.
export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST() {
  return NextResponse.json({ erro: "Não implementado (Fase 7)." }, { status: 501 });
}
