import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";
import { requireTenant } from "@/server/auth";

export type KbDocument = Database["public"]["Tables"]["kb_documents"]["Row"];

/** Materiais visíveis para o tenant (base global + os próprios). RLS aplica o escopo. */
export const listKbDocuments = cache(async (): Promise<KbDocument[]> => {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("kb_documents")
    .select("*")
    .order("created_at", { ascending: false });
  return data ?? [];
});

export type KbEscopoStats = { docs: number; chunks: number };
export type KbStats = { sistema: KbEscopoStats; tenant: KbEscopoStats };

/** Cobertura por escopo: nº de materiais prontos e de trechos indexados. */
export const getKbStats = cache(async (): Promise<KbStats> => {
  await requireTenant();
  const supabase = await createClient();

  const contar = async (scope: "global" | "tenant"): Promise<KbEscopoStats> => {
    const [docsRes, chunksRes] = await Promise.all([
      supabase
        .from("kb_documents")
        .select("id", { count: "exact", head: true })
        .eq("scope", scope)
        .eq("status", "ready"),
      supabase.from("kb_chunks").select("id", { count: "exact", head: true }).eq("scope", scope),
    ]);
    return { docs: docsRes.count ?? 0, chunks: chunksRes.count ?? 0 };
  };

  const [sistema, tenant] = await Promise.all([contar("global"), contar("tenant")]);
  return { sistema, tenant };
});
