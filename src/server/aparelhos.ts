import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";
import { requireTenant } from "@/server/auth";

export type Aparelho = Database["public"]["Tables"]["studio_equipment"]["Row"];

/** Lista os aparelhos do estúdio do tenant (RLS aplica o escopo). */
export const listAparelhos = cache(async (): Promise<Aparelho[]> => {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("studio_equipment")
    .select("*")
    .order("apparatus")
    .order("label");
  return data ?? [];
});

/** Busca um aparelho por id (RLS garante o escopo do tenant). 404 se não achar. */
export const getAparelho = cache(async (id: string): Promise<Aparelho> => {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase.from("studio_equipment").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return data;
});

/** Contagem de aparelhos por tipo (para a IA dimensionar a rotação). */
export const contagemPorAparelho = cache(
  async (): Promise<{ apparatus: string; count: number }[]> => {
    await requireTenant();
    const supabase = await createClient();
    const { data } = await supabase
      .from("studio_equipment")
      .select("apparatus")
      .eq("status", "active");
    const map = new Map<string, number>();
    for (const r of data ?? []) map.set(r.apparatus, (map.get(r.apparatus) ?? 0) + 1);
    return [...map.entries()].map(([apparatus, count]) => ({ apparatus, count }));
  },
);

/**
 * Unidades ATIVAS do estúdio — cada uma vira uma "estação" para a rotação na
 * aula coletiva. Usado por buildDossieColetivo (IA).
 */
export const listEstacoesAtivas = cache(async (): Promise<Aparelho[]> => {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("studio_equipment")
    .select("*")
    .eq("status", "active")
    .order("apparatus")
    .order("label");
  return data ?? [];
});
