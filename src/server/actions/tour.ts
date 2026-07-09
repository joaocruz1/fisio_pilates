"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/server/actions/result";
import { requireTenant } from "@/server/auth";

/** Marca o tour guiado como concluído/visto (não reabre sozinho). */
export async function concluirTour(): Promise<ActionResult> {
  const ctx = await requireTenant();
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ tour_completed_at: new Date().toISOString() })
    .eq("id", ctx.user.id);
  if (error) return { ok: false, erro: "Não foi possível salvar o progresso." };
  revalidatePath("/", "layout");
  return { ok: true, data: null };
}
