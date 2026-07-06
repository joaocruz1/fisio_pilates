import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";
import { requireTenant } from "@/server/auth";

export type Measurement = Database["public"]["Tables"]["body_measurements"]["Row"];

export const listMeasurements = cache(async (studentId: string): Promise<Measurement[]> => {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("body_measurements")
    .select("*")
    .eq("student_id", studentId)
    .order("measured_at", { ascending: false });
  return data ?? [];
});
