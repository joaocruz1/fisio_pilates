/**
 * Catálogo de modelos de IA — fonte única da verdade.
 *
 * Cada rota de IA resolve o slug OpenRouter a partir de:
 *   1) override explícito (chat permite model no body da request), ou
 *   2) preferência da usuária (`getPreferenciasIA(userId).chat|report|vision`), ou
 *   3) nível padrão da feature (`nivelPadrao`).
 *
 * Antes de chamar o provider, o servidor valida `suportaFeature(slug, feature)`:
 * modelos que não suportam uma feature caem para o fallback do sistema
 * (`MODELS.main()`) com `console.warn` — sem quebrar o request.
 *
 * Preços em USD por 1M tokens (input, output). Atualizado em jul/2026 —
 * cotação OpenRouter. Quando o Stripe meter entra, esse catálogo vira a
 * fonte de verdade pra fatura pro-rata também.
 *
 * Não importa nada de `@/lib/ai/client` (server-only) — este módulo é seguro
 * para Client Components. O slug do "modelo principal do sistema" é o mesmo
 * que `MODELS.main()` em produção, mantido em sincronia pela constante
 * `SLUG_FALLBACK_SISTEMA` abaixo.
 */

export const SLUG_FALLBACK_SISTEMA = "anthropic/claude-sonnet-5";

export type NivelModelo = "economico" | "balanceado" | "alta_precisao";
export type FeatureIA = "chat" | "relatorio" | "vision";

/** Dois eixos visuais (1=baixo, 3=alto). Inversos: quanto menor a precisão, maior a velocidade. */
export const NIVEL_PRECISAO: Record<NivelModelo, 1 | 2 | 3> = {
  economico: 1,
  balanceado: 2,
  alta_precisao: 3,
};

export const NIVEL_VELOCIDADE: Record<NivelModelo, 1 | 2 | 3> = {
  economico: 3,
  balanceado: 2,
  alta_precisao: 1,
};

/** Slug OpenRouter + preço (USD / 1M tokens) por modelo. */
interface ModeloEntrada {
  slug: string;
  precos: { input: number; output: number };
  /** Features que o modelo atende. */
  suporta: ReadonlyArray<FeatureIA>;
}

/** Catálogo por nível. */
export const MODELOS: Record<NivelModelo, ModeloEntrada> = {
  economico: {
    slug: "deepseek/deepseek-chat-v3-0324",
    precos: { input: 0.2, output: 0.77 },
    suporta: ["chat", "relatorio"],
  },
  balanceado: {
    slug: "anthropic/claude-haiku-4.5",
    precos: { input: 1.0, output: 5.0 },
    suporta: ["chat", "relatorio"],
  },
  alta_precisao: {
    slug: "anthropic/claude-sonnet-5",
    precos: { input: 3.0, output: 15.0 },
    suporta: ["chat", "relatorio", "vision"],
  },
};

/**
 * Vision tem um caso especial: o nível "econômico" para vision é o Gemini
 * 2.5 Flash, não o DeepSeek (que não suporta imagem). Mantemos esse mapa
 * explícito em vez de tentar casar via `MODELOS.<nivel>`.
 */
const VISION_POR_NIVEL: Record<NivelModelo, ModeloEntrada | null> = {
  economico: {
    slug: "google/gemini-2.5-flash",
    precos: { input: 0.14, output: 0.28 },
    suporta: ["vision"],
  },
  balanceado: null, // não há tier intermediário pra vision (Gemini Flash já é meio-termo)
  alta_precisao: MODELOS.alta_precisao,
};

/** Nível padrão por feature (quando usuária não tem preferência salva). */
export function nivelPadrao(feature: FeatureIA): NivelModelo {
  if (feature === "chat") return "balanceado";
  return "alta_precisao";
}

/**
 * Resolve o slug OpenRouter para a combinação (nível, feature).
 * - Vision só tem 2 níveis: econômico → Gemini Flash; alta precisão → Sonnet 5.
 *   Balanceado retorna o slug de alta precisão (fallback) já que não há tier
 *   intermediário pra vision no nosso catálogo.
 * - Retorna também `fallbackAplicado: true` quando o nível original não tinha
 *   mapping direto (útil para logar warning no caller).
 */
export function modeloParaFeature(
  nivel: NivelModelo,
  feature: FeatureIA,
): { slug: string; fallbackAplicado: boolean } {
  if (feature === "vision") {
    const entry = VISION_POR_NIVEL[nivel];
    if (entry) return { slug: entry.slug, fallbackAplicado: false };
    // alta_precisao sempre presente (não-null no tipo do catálogo).
    return {
      slug: VISION_POR_NIVEL.alta_precisao?.slug ?? SLUG_FALLBACK_SISTEMA,
      fallbackAplicado: true,
    };
  }
  return { slug: MODELOS[nivel].slug, fallbackAplicado: false };
}

/** True se o slug (OpenRouter) é capaz de processar a feature. */
export function suportaFeature(slug: string, feature: FeatureIA): boolean {
  for (const entry of Object.values(MODELOS)) {
    if (entry.slug === slug) return entry.suporta.includes(feature);
  }
  for (const entry of Object.values(VISION_POR_NIVEL)) {
    if (entry && entry.slug === slug) return entry.suporta.includes(feature);
  }
  // Slug desconhecido → deixa o provider decidir (assume que suporta tudo).
  return true;
}

/** Preço (USD/1M tokens) por slug. Fallback: preço do modelo principal do sistema. */
export function precosDoModelo(slug: string): { input: number; output: number } {
  // Embeddings: tabela à parte (não tem nível porque é fixo por env).
  if (slug === "openai/text-embedding-3-small" || slug.includes("embedding")) {
    return { input: 0.02, output: 0 };
  }
  for (const entry of Object.values(MODELOS)) {
    if (entry.slug === slug) return entry.precos;
  }
  for (const entry of Object.values(VISION_POR_NIVEL)) {
    if (entry && entry.slug === slug) return entry.precos;
  }
  // Slug desconhecido — provavelmente o main do sistema (Sonnet). Loga 1x e usa.
  if (slug !== SLUG_FALLBACK_SISTEMA) {
    console.warn(`[modelos] slug desconhecido: ${slug} — usando preço do modelo principal`);
  }
  return MODELOS.alta_precisao.precos;
}

/** Catálogo serializável para a UI (sem expor preço de modelos que não usamos). */
export function catalogoParaUi(): Record<
  FeatureIA,
  Array<{ nivel: NivelModelo; slug: string; precos: { input: number; output: number } }>
> {
  return {
    chat: (["economico", "balanceado", "alta_precisao"] as const).map((n) => ({
      nivel: n,
      slug: MODELOS[n].slug,
      precos: MODELOS[n].precos,
    })),
    relatorio: (["economico", "balanceado", "alta_precisao"] as const).map((n) => ({
      nivel: n,
      slug: MODELOS[n].slug,
      precos: MODELOS[n].precos,
    })),
    vision: (["economico", "alta_precisao"] as const).flatMap((n) => {
      const entry = VISION_POR_NIVEL[n];
      return entry ? [{ nivel: n, slug: entry.slug, precos: entry.precos }] : [];
    }),
  };
}
