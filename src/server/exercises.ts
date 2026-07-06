import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";
import { requireTenant } from "@/server/auth";

export type Exercise = Pick<
  Database["public"]["Tables"]["exercises"]["Row"],
  "id" | "name" | "apparatus" | "category" | "difficulty"
>;

/** Catálogo global + exercícios do tenant (RLS aplica o escopo). */
export const listExercises = cache(async (): Promise<Exercise[]> => {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("exercises")
    .select("id, name, apparatus, category, difficulty")
    .eq("is_active", true)
    .order("apparatus")
    .order("name");
  return data ?? [];
});
