import { z } from "zod";

/**
 * Validação centralizada das variáveis de ambiente.
 *
 * A validação é LAZY (só roda na primeira chamada de `env()`), para que o
 * scaffold e o `tsc`/`biome` funcionem antes de `.env.local` existir. Chame
 * `env()` dentro de funções de servidor (clients Supabase, rotas de IA/ingestão)
 * — nunca no topo de módulos de UI.
 */
const serverSchema = z.object({
  APP_URL: z.string().url().default("http://localhost:3000"),

  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  OPENROUTER_API_KEY: z.string().min(1),
  OPENROUTER_MODEL: z.string().default("anthropic/claude-sonnet-5"),
  OPENROUTER_FALLBACK_MODEL: z.string().default("anthropic/claude-sonnet-4.6"),
  OPENROUTER_SMALL_MODEL: z.string().default("anthropic/claude-haiku-4.5"),

  EMBEDDINGS_MODEL: z.string().default("openai/text-embedding-3-small"),
  EMBEDDINGS_DIM: z.coerce.number().int().positive().default(1536),

  QSTASH_TOKEN: z.string().min(1),
  QSTASH_CURRENT_SIGNING_KEY: z.string().min(1),
  QSTASH_NEXT_SIGNING_KEY: z.string().min(1),

  TAVILY_API_KEY: z.string().min(1),
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
