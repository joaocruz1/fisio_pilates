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
