"use server";
import "server-only";
import { addWeeks, format, parseISO } from "date-fns";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/server/actions/result";
import { requireTenant } from "@/server/auth";

const STATUS_VALIDOS = ["scheduled", "completed", "no_show", "cancelled"] as const;
type StatusAgendamento = (typeof STATUS_VALIDOS)[number];

/** Cria um agendamento (opcionalmente recorrente por N semanas adicionais). */
export async function criarAgendamento(input: {
  studentId: string;
  data: string; // YYYY-MM-DD
  hora: string; // HH:MM
  duracaoMin: number;
  repetirSemanas: number; // 0 = sem recorrência
  notes?: string;
}): Promise<ActionResult<{ criados: number }>> {
  const ctx = await requireTenant();
  if (!input.studentId) return { ok: false, erro: "Escolha o aluno." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.data)) return { ok: false, erro: "Data inválida." };
  if (!/^\d{2}:\d{2}$/.test(input.hora)) return { ok: false, erro: "Horário inválido." };
  const duracao = Number.isFinite(input.duracaoMin) ? Math.round(input.duracaoMin) : 50;
  if (duracao < 10 || duracao > 240) return { ok: false, erro: "Duração inválida." };

  const repeticoes = Math.min(Math.max(Math.round(input.repetirSemanas || 0), 0), 52);
  const seriesId = repeticoes > 0 ? crypto.randomUUID() : null;
  const base = parseISO(input.data);
  const notes = input.notes?.trim() || null;

  const linhas = Array.from({ length: repeticoes + 1 }, (_, i) => ({
    tenant_id: ctx.tenant.id,
    student_id: input.studentId,
    appointment_date: format(addWeeks(base, i), "yyyy-MM-dd"),
    start_time: `${input.hora}:00`,
    duration_min: duracao,
    status: "scheduled",
    notes,
    series_id: seriesId,
    created_by: ctx.user.id,
  }));

  const supabase = await createClient();
  const { error } = await supabase.from("appointments").insert(linhas);
  if (error) return { ok: false, erro: "Não foi possível agendar." };

  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { ok: true, data: { criados: linhas.length } };
}

/** Atualiza o status de um agendamento (realizada/faltou/cancelada/agendada). */
export async function atualizarStatusAgendamento(
  id: string,
  status: StatusAgendamento,
): Promise<ActionResult> {
  await requireTenant();
  if (!STATUS_VALIDOS.includes(status)) return { ok: false, erro: "Status inválido." };
  const supabase = await createClient();
  const { error } = await supabase.from("appointments").update({ status }).eq("id", id);
  if (error) return { ok: false, erro: "Não foi possível atualizar." };
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { ok: true, data: null };
}

/** Exclui um agendamento (ou toda a série, se `serie` for true). */
export async function excluirAgendamento(id: string, serie = false): Promise<ActionResult> {
  await requireTenant();
  const supabase = await createClient();

  if (serie) {
    const { data: alvo } = await supabase
      .from("appointments")
      .select("series_id")
      .eq("id", id)
      .maybeSingle();
    if (alvo?.series_id) {
      const { error } = await supabase
        .from("appointments")
        .delete()
        .eq("series_id", alvo.series_id);
      if (error) return { ok: false, erro: "Não foi possível excluir a série." };
      revalidatePath("/agenda");
      revalidatePath("/dashboard");
      return { ok: true, data: null };
    }
  }

  const { error } = await supabase.from("appointments").delete().eq("id", id);
  if (error) return { ok: false, erro: "Não foi possível excluir." };
  revalidatePath("/agenda");
  revalidatePath("/dashboard");
  return { ok: true, data: null };
}
