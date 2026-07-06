import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";
import { requireTenant } from "@/server/auth";

export type Condition = Database["public"]["Tables"]["student_conditions"]["Row"];

export const listConditions = cache(async (studentId: string): Promise<Condition[]> => {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_conditions")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  return data ?? [];
});
