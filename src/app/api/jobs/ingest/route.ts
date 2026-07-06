import { NextResponse } from "next/server";

// Worker de ingestão da base de conhecimento, disparado pelo QStash em lotes de
// 50 páginas auto-encadeados e idempotentes — Fase 5. Ver docs/plan/03-rag.md.
// A assinatura do QStash DEVE ser verificada antes de processar.
export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST() {
  return NextResponse.json({ erro: "Não implementado (Fase 5)." }, { status: 501 });
}
