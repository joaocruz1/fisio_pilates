"use server";
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { textos } from "@/lib/textos";
import { type TemaInput, temaSchema } from "@/lib/validators/tema";
import type { ActionResult } from "@/server/actions/result";
import { requireTenant } from "@/server/auth";

/**
 * Persiste a preferência de tema na conta, para acompanhar a usuária entre
 * dispositivos.
 *
 * Sem revalidatePath de propósito: o next-themes já trocou o tema no DOM de
 * forma otimista antes desta chamada. Revalidar re-renderizaria o layout
 * inteiro por algo puramente cosmético que já aconteceu.
 */
export async function salvarTema(input: TemaInput): Promise<ActionResult> {
  const ctx = await requireTenant();
  const parsed = temaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: parsed.error.issues[0].message };

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ theme: parsed.data.tema })
    .eq("id", ctx.user.id);
  if (error) return { ok: false, erro: textos.tema.erros.salvar };

  return { ok: true, data: null };
}
