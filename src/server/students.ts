import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";
import { requireTenant } from "@/server/auth";

export type Student = Database["public"]["Tables"]["students"]["Row"];

/** Lista os alunos não excluídos do tenant (RLS aplica o escopo). */
export const listStudents = cache(async (): Promise<Student[]> => {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("*")
    .is("deleted_at", null)
    .order("full_name");
  return data ?? [];
});

/** Busca um aluno por id (RLS garante que só o tenant dono enxerga). 404 se não achar. */
export const getStudent = cache(async (id: string): Promise<Student> => {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (!data) notFound();
  return data;
});
