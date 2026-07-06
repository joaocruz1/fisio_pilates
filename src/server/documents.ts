import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";
import { requireTenant } from "@/server/auth";

export type Document = Database["public"]["Tables"]["documents"]["Row"];

export const listDocuments = cache(async (studentId: string): Promise<Document[]> => {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("documents")
    .select("*")
    .eq("student_id", studentId)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });
  return data ?? [];
});
