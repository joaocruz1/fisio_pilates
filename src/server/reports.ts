import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";
import { requireTenant } from "@/server/auth";

export type Report = Database["public"]["Tables"]["ai_reports"]["Row"];

export const listReports = cache(async (studentId: string): Promise<Report[]> => {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_reports")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false });
  return data ?? [];
});
