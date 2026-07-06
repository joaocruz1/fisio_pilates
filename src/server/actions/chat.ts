"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/server/actions/result";
import { requireTenant } from "@/server/auth";

export async function excluirConversa(id: string): Promise<ActionResult> {
  await requireTenant();
  const supabase = await createClient();
  const { error } = await supabase.from("chat_conversations").delete().eq("id", id);
  if (error) return { ok: false, erro: "Não foi possível excluir a conversa." };
  revalidatePath("/assistente");
  return { ok: true, data: null };
}
