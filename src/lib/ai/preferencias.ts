import "server-only";
import {
  type FeatureIA,
  modeloParaFeature,
  type NivelModelo,
  nivelPadrao,
  suportaFeature,
} from "@/lib/ai/modelos";
import { createClient } from "@/lib/supabase/server";

/**
 * Preferências de modelo de IA por usuária.
 *
 * Lê de `public.user_ai_preferences` (RLS: user só lê/edita o próprio).
 * Se a linha não existe, retorna os defaults do sistema — sem inserir
 * eagerly: a primeira gravação real (via action `atualizarPreferenciasIA`)
 * é o que materializa a linha.
 */

export interface PreferenciasIA {
  chat: NivelModelo;
  report: NivelModelo;
  vision: NivelModelo;
}

/** Vision só tem 2 níveis no app (sem balanceado). */
export type NivelVision = "economico" | "alta_precisao";

/** Defaults do sistema (espelham os defaults da migration). */
function defaults(): PreferenciasIA {
  return {
    chat: nivelPadrao("chat"),
    report: nivelPadrao("relatorio"),
    vision: nivelPadrao("vision"),
  };
}

/** Lê as preferências da usuária. Retorna defaults se a linha não existe. */
export async function getPreferenciasIA(userId: string): Promise<PreferenciasIA> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("user_ai_preferences")
    .select("chat_model, report_model, vision_model")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("[preferencias] erro ao ler preferências:", error.message);
    return defaults();
  }
  if (!data) return defaults();

  return {
    chat: data.chat_model as NivelModelo,
    report: data.report_model as NivelModelo,
    vision: data.vision_model as NivelModelo,
  };
}

/**
 * Resolve o slug OpenRouter que deve ser usado para uma feature,
 * respeitando a preferência da usuária. Se o modelo da preferência
 * não suporta a feature (ex.: DeepSeek + vision), cai pro slug
 * de alta precisão com log de warning — não quebra o request.
 */
export async function getModeloParaFeature(userId: string, feature: FeatureIA): Promise<string> {
  const prefs = await getPreferenciasIA(userId);
  const nivel =
    feature === "chat" ? prefs.chat : feature === "relatorio" ? prefs.report : prefs.vision;
  const { slug, fallbackAplicado } = modeloParaFeature(nivel, feature);

  if (fallbackAplicado) {
    console.warn(
      `[preferencias] nível ${nivel} sem mapping direto para ${feature}; usando alta precisão`,
      { userId, nivel, feature, slug },
    );
  }
  if (!suportaFeature(slug, feature)) {
    console.warn(
      `[preferencias] modelo ${slug} não suporta ${feature}; caindo para alta precisão`,
      { userId, nivel, feature },
    );
    return modeloParaFeature("alta_precisao", feature).slug;
  }
  return slug;
}
