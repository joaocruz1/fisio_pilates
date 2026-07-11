"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { STATUS_APARELHO } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import {
  type AtualizarAparelhoInput,
  atualizarAparelhoSchema,
  type CriarAparelhoInput,
  criarAparelhoSchema,
} from "@/lib/validators/aparelho";
import type { ActionResult } from "@/server/actions/result";
import { requireTenant } from "@/server/auth";
import { registrarAuditoria } from "@/server/services/audit";

const nn = (v?: string | null) => {
  const t = v?.trim();
  return t ? t : null;
};

export async function criarAparelho(
  input: CriarAparelhoInput,
): Promise<ActionResult<{ id: string }>> {
  const ctx = await requireTenant();

  const parsed = criarAparelhoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("studio_equipment")
    .insert({
      tenant_id: ctx.tenant.id,
      apparatus: d.apparatus,
      label: d.label,
      status: d.status ?? "active",
      notes: nn(d.notes),
      created_by: ctx.user.id,
    })
    .select("id")
    .single();

  if (error || !data) {
    if (error?.code === "23505") {
      return { ok: false, erro: "Já existe um aparelho com esse rótulo no estúdio." };
    }
    return { ok: false, erro: "Não foi possível salvar o aparelho. Tente novamente." };
  }

  await registrarAuditoria(supabase, {
    tenantId: ctx.tenant.id,
    userId: ctx.user.id,
    action: "equipment.create",
    entityType: "studio_equipment",
    entityId: data.id,
  });

  revalidatePath("/aparelhos");
  return { ok: true, data: { id: data.id } };
}

export async function atualizarAparelho(
  id: string,
  input: AtualizarAparelhoInput,
): Promise<ActionResult> {
  await requireTenant();

  const parsed = atualizarAparelhoSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const d = parsed.data;
  const supabase = await createClient();

  // tenant_id nunca vem do form; a RLS restringe o UPDATE ao tenant da sessão.
  const { error } = await supabase
    .from("studio_equipment")
    .update({
      apparatus: d.apparatus,
      label: d.label,
      status: d.status ?? "active",
      notes: nn(d.notes),
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { ok: false, erro: "Já existe um aparelho com esse rótulo no estúdio." };
    }
    return { ok: false, erro: "Não foi possível salvar as alterações. Tente novamente." };
  }

  revalidatePath("/aparelhos");
  revalidatePath(`/aparelhos/${id}`);
  return { ok: true, data: null };
}

export async function excluirAparelho(id: string): Promise<ActionResult> {
  const ctx = await requireTenant();
  const supabase = await createClient();

  // Inventário: hard delete (não há `deleted_at` — não é dado clínico sensível).
  const { error } = await supabase.from("studio_equipment").delete().eq("id", id);

  if (error) return { ok: false, erro: "Não foi possível excluir o aparelho. Tente novamente." };

  await registrarAuditoria(supabase, {
    tenantId: ctx.tenant.id,
    userId: ctx.user.id,
    action: "equipment.delete",
    entityType: "studio_equipment",
    entityId: id,
  });

  revalidatePath("/aparelhos");
  return { ok: true, data: null };
}

export async function alterarStatusAparelho(id: string, status: string): Promise<ActionResult> {
  await requireTenant();
  if (!STATUS_APARELHO.includes(status as (typeof STATUS_APARELHO)[number])) {
    return { ok: false, erro: "Status inválido." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("studio_equipment").update({ status }).eq("id", id);
  if (error) return { ok: false, erro: "Não foi possível atualizar o status. Tente novamente." };

  revalidatePath("/aparelhos");
  revalidatePath(`/aparelhos/${id}`);
  return { ok: true, data: null };
}
