import { createBrowserClient } from "@supabase/ssr";
import { publicEnv } from "@/lib/env";
import type { Database } from "@/lib/types/database.types";

/** Client Supabase para uso em Client Components (browser). RLS sempre ativa. */
export function createClient() {
  const { supabaseUrl, supabaseAnonKey } = publicEnv();
  return createBrowserClient<Database>(supabaseUrl, supabaseAnonKey);
}
