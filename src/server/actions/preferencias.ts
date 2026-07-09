"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { textos } from "@/lib/textos";
import { type PreferenciasIAInput, preferenciasIASchema } from "@/lib/validators/preferencias-ia";
import { requireTenant } from "@/server/auth";

export type ActionResult<T = void> = { ok: true; data: T } | { ok: false; erro: string };

/**
 * Salva a preferência de modelo de IA da usuária.
 *
 * Upsert em `user_ai_preferences` (chave: user_id). RLS já garante que
 * a usuária só pode editar a própria linha. Usamos `createClient` (server
 * autenticado) — não `admin` — pra preservar o filtro de RLS e evitar
 * escalonamento indevido de privilégio.
 */
export async function atualizarPreferenciasIA(
  input: PreferenciasIAInput,
): Promise<ActionResult<undefined>> {
  const ctx = await requireTenant();

  const parsed = preferenciasIASchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      erro: parsed.error.issues[0]?.message ?? textos.modelo.erros.salvar,
    };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("user_ai_preferences").upsert(
    {
      user_id: ctx.user.id,
      chat_model: parsed.data.chat,
      report_model: parsed.data.report,
      vision_model: parsed.data.vision,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("[preferencias] erro ao salvar:", error.message);
    return { ok: false, erro: textos.modelo.erros.salvar };
  }

  // Revalida onde o modelo é exibido/usado.
  revalidatePath("/configuracoes");
  revalidatePath("/dashboard");
  return { ok: true, data: undefined };
}
