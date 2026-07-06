/**
 * PLACEHOLDER — substituído pela saída de `npm run db:types`
 * (`supabase gen types typescript`) a partir da Fase 0, quando o projeto
 * Supabase e as migrations existirem. Ver docs/plan/02-banco-de-dados.md.
 */
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: Record<string, never>;
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
