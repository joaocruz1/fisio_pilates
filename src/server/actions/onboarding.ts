"use server";
import "server-only";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { OnboardingInput, PerfilInput } from "@/lib/validators/onboarding";
import { onboardingSchema, perfilSchema } from "@/lib/validators/onboarding";
import { requireOnboarding, requireTenant } from "@/server/auth";

export type ActionResult = { ok: true } | { ok: false; erro: string };

function limpar(v?: string) {
  const t = v?.trim();
  return t ? t : null;
}

/** Completa o perfil no primeiro acesso e libera o app. Redireciona ao dashboard. */
export async function completarOnboarding(input: OnboardingInput): Promise<ActionResult> {
  const ctx = await requireOnboarding();

  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { fullName, studioName, crefito, phone } = parsed.data;
  const supabase = await createClient();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      phone: limpar(phone),
      crefito: limpar(crefito),
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq("id", ctx.user.id);
  if (profileError)
    return { ok: false, erro: "Não foi possível salvar seu perfil. Tente novamente." };

  const nomeEstudio = limpar(studioName);
  if (nomeEstudio) {
    const { error: tenantError } = await supabase
      .from("tenants")
      .update({ name: nomeEstudio })
      .eq("id", ctx.tenant.id);
    if (tenantError)
      return { ok: false, erro: "Não foi possível salvar o estúdio. Tente novamente." };
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/** Edita o perfil em Configurações. Permanece na página (toast de sucesso). */
export async function atualizarPerfil(input: PerfilInput): Promise<ActionResult> {
  const ctx = await requireTenant();

  const parsed = perfilSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, erro: parsed.error.issues[0]?.message ?? "Dados inválidos." };
  }
  const { fullName, studioName, crefito, phone } = parsed.data;
  const supabase = await createClient();

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ full_name: fullName, phone: limpar(phone), crefito: limpar(crefito) })
    .eq("id", ctx.user.id);
  if (profileError)
    return { ok: false, erro: "Não foi possível salvar seu perfil. Tente novamente." };

  const nomeEstudio = limpar(studioName);
  if (nomeEstudio) {
    const { error: tenantError } = await supabase
      .from("tenants")
      .update({ name: nomeEstudio })
      .eq("id", ctx.tenant.id);
    if (tenantError)
      return { ok: false, erro: "Não foi possível salvar o estúdio. Tente novamente." };
  }

  revalidatePath("/configuracoes");
  revalidatePath("/", "layout");
  return { ok: true };
}
