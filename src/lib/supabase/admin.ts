import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import type { Database } from "@/lib/types/database.types";

/**
 * Client com service_role — BYPASSA RLS. Use APENAS em pipelines de servidor
 * (worker de ingestão, geração de relatório) e SEMPRE filtre `tenant_id`
 * manualmente. Ver checklist em docs/plan/07-lgpd-seguranca.md.
 */
export function createAdminClient() {
  const e = env();
  return createSupabaseClient<Database>(e.NEXT_PUBLIC_SUPABASE_URL, e.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
