import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

/**
 * Helpers de sessão/tenant para uso em Server Components e Server Actions.
 * A implementação completa (resolução de tenant via `tenant_members`) chega na
 * Fase 1 — ver docs/plan/05-frontend-ux.md e 02-banco-de-dados.md.
 *
 * `cache()` deduplica a chamada dentro de um mesmo render/request.
 */
export const getUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export async function requireUser() {
  const user = await getUser();
  if (!user) redirect("/login");
  return user;
}

// TODO (Fase 1): requireTenant() — resolve o tenant da usuária via tenant_members.
