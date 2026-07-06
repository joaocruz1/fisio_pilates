import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";
import { requireTenant } from "@/server/auth";

export type Assessment = Database["public"]["Tables"]["assessments"]["Row"];

export const listAssessments = cache(async (studentId: string): Promise<Assessment[]> => {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("assessments")
    .select("*")
    .eq("student_id", studentId)
    .is("deleted_at", null)
    .order("assessed_at", { ascending: false })
    .order("created_at", { ascending: false });
  return data ?? [];
});

export const getAssessment = cache(async (id: string): Promise<Assessment> => {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("assessments")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) notFound();
  return data;
});
