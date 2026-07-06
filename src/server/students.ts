import "server-only";
import { notFound } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/types/database.types";
import { idadeAnos } from "@/lib/utils";
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

/**
 * Snapshot textual de um aluno para a tool do chat (RLS isola por tenant).
 * Usa apenas o primeiro nome (minimização LGPD). Retorna texto pronto p/ o modelo.
 */
export async function getStudentSnapshot({ nomeOuId }: { nomeOuId: string }): Promise<string> {
  await requireTenant();
  const supabase = await createClient();

  const ehUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(nomeOuId);
  const base = supabase
    .from("students")
    .select("id, full_name, birth_date, sex")
    .is("deleted_at", null);
  const { data: alunos } = ehUuid
    ? await base.eq("id", nomeOuId).limit(1)
    : await base.ilike("full_name", `%${nomeOuId}%`).limit(1);
  const aluno = alunos?.[0];
  if (!aluno) return "Nenhum aluno encontrado com esse nome no seu cadastro.";

  const primeiroNome = aluno.full_name.trim().split(" ")[0] ?? "Aluno(a)";
  const idade = idadeAnos(aluno.birth_date);

  const [{ data: condicoes }, { data: sessoes }, { data: medida }] = await Promise.all([
    supabase.from("student_conditions").select("name, status, severity").eq("student_id", aluno.id),
    supabase
      .from("sessions")
      .select("session_date, focus, pain_level_pre, pain_level_post")
      .eq("student_id", aluno.id)
      .is("deleted_at", null)
      .order("session_date", { ascending: false })
      .limit(5),
    supabase
      .from("body_measurements")
      .select("measured_at, weight_kg")
      .eq("student_id", aluno.id)
      .order("measured_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const linhas = [
    `Aluno(a): ${primeiroNome}${idade != null ? `, ${idade} anos` : ""}.`,
    (condicoes ?? []).length
      ? `Condições: ${(condicoes ?? []).map((c) => `${c.name} [${c.status}]`).join("; ")}.`
      : "Sem condições registradas.",
    (sessoes ?? []).length
      ? `Últimas sessões: ${(sessoes ?? [])
          .map(
            (s) =>
              `${s.session_date} (${s.focus ?? "sessão"}, dor ${s.pain_level_pre ?? "—"}→${s.pain_level_post ?? "—"})`,
          )
          .join("; ")}.`
      : "Sem sessões registradas.",
    medida?.weight_kg != null
      ? `Última medida: ${medida.weight_kg}kg em ${medida.measured_at}.`
      : "",
  ].filter(Boolean);

  return linhas.join("\n");
}
