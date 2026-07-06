import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/types/database.types";

type Client = SupabaseClient<Database>;

/**
 * Registra uma entrada na trilha de auditoria (LGPD). Best-effort: uma falha
 * de auditoria não deve derrubar a operação de negócio (loga e segue).
 */
export async function registrarAuditoria(
  supabase: Client,
  entry: {
    tenantId: string;
    userId: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  },
) {
  const { error } = await supabase.from("audit_logs").insert({
    tenant_id: entry.tenantId,
    user_id: entry.userId,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    metadata: (entry.metadata ??
      {}) as Database["public"]["Tables"]["audit_logs"]["Insert"]["metadata"],
  });
  if (error) console.error("Falha ao registrar auditoria:", entry.action, error.message);
}
