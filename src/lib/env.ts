import { z } from "zod";

/**
 * Validação centralizada das variáveis de ambiente.
 *
 * A validação é LAZY (só roda na primeira chamada de `env()`), para que o
 * scaffold e o `tsc`/`biome` funcionem antes de `.env.local` existir. Chame
 * `env()` dentro de funções de servidor (clients Supabase, rotas de IA/ingestão)
 * — nunca no topo de módulos de UI.
 */
/**
 * String opcional de integração: trata "" (variável presente porém vazia no
 * `.env`) como ausente. Assim, integrações não provisionadas (QStash/Tavily)
 * NÃO derrubam a validação global e, com ela, features de IA que nem as usam.
 */
const optionalIntegrationString = z
  .string()
  .optional()
  .transform((v) => (v?.trim() ? v : undefined));

const serverSchema = z.object({
  APP_URL: z.string().url().default("http://localhost:3000"),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  OPENROUTER_API_KEY: z.string().min(1),
  OPENROUTER_MODEL: z.string().default("anthropic/claude-sonnet-5"),
  OPENROUTER_MODEL_FALLBACK: z.string().default("anthropic/claude-sonnet-4.6"),
  OPENROUTER_MODEL_CHEAP: z.string().default("anthropic/claude-haiku-4.5"),

  EMBEDDINGS_MODEL: z.string().default("openai/text-embedding-3-small"),
  EMBEDDINGS_DIM: z.coerce.number().int().positive().default(1536),

  // Integrações OPCIONAIS. Só são necessárias para a fila de ingestão da KB
  // (QStash) e o fallback de busca web (Tavily). A ausência é validada nos
  // pontos que realmente as usam (ver src/lib/qstash.ts e src/lib/ai/tavily.ts),
  // nunca aqui de forma global.
  QSTASH_TOKEN: optionalIntegrationString,
  QSTASH_CURRENT_SIGNING_KEY: optionalIntegrationString,
  QSTASH_NEXT_SIGNING_KEY: optionalIntegrationString,

  TAVILY_API_KEY: optionalIntegrationString,

  // Opcional: habilita reproduzir o vídeo do exercício DENTRO do app (resolve o
  // 1º resultado da busca via YouTube Data API). Sem a chave, o app abre a busca
  // no YouTube/TikTok em nova aba (o embed por busca do YouTube foi descontinuado).
  YOUTUBE_API_KEY: optionalIntegrationString,
});

export type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | null = null;

export function env(): ServerEnv {
  if (cached) return cached;
  const parsed = serverSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(
      `Variáveis de ambiente inválidas ou ausentes:\n${z.prettifyError(parsed.error)}`,
    );
  }
  cached = parsed.data;
  return cached;
}

/** Subconjunto público, seguro para o cliente. */
export function publicEnv() {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL as string,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string,
  };
}
