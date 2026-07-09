"use server";
import "server-only";
import { createClient } from "@/lib/supabase/server";
import { formatarData } from "@/lib/utils";
import { requireTenant } from "@/server/auth";

export type ContextoDoAluno = {
  planos: { id: string; rotulo: string }[];
  relatorios: { id: string; rotulo: string }[];
};

/**
 * Lista os planos de aula e relatórios de evolução COMPLETOS de um aluno, para
 * o picker de "anexar contexto" do chat. RLS isola por tenant.
 */
export async function listarContextosDoAluno(studentId: string): Promise<ContextoDoAluno> {
  await requireTenant();
  const supabase = await createClient();
  const { data } = await supabase
    .from("ai_reports")
    .select("id, report_type, created_at, status")
    .eq("student_id", studentId)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(30);

  const planos: ContextoDoAluno["planos"] = [];
  const relatorios: ContextoDoAluno["relatorios"] = [];
  for (const r of data ?? []) {
    const dia = formatarData(r.created_at.slice(0, 10));
    if (r.report_type === "next_session") {
      planos.push({ id: r.id, rotulo: `Plano de ${dia}` });
    } else {
      relatorios.push({ id: r.id, rotulo: `Relatório de ${dia}` });
    }
  }
  return { planos, relatorios };
}
