/**
 * Tipos do banco.
 *
 * ⚠️ ESCRITO À MÃO temporariamente (cobre apenas as tabelas da Fase 0:
 * tenants, profiles, tenant_members). Assim que o projeto Supabase existir,
 * REGERAR com `npm run db:types` (`supabase gen types typescript`) — isso
 * sobrescreve este arquivo com o schema completo. Ver docs/plan/02-banco-de-dados.md.
 */
export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export type Database = {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          plan: string;
          plan_expires_at: string | null;
          status: string;
          ai_monthly_limit_usd: number;
          settings: Json;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          plan?: string;
          plan_expires_at?: string | null;
          status?: string;
          ai_monthly_limit_usd?: number;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          plan?: string;
          plan_expires_at?: string | null;
          status?: string;
          ai_monthly_limit_usd?: number;
          settings?: Json;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          full_name: string;
          phone: string | null;
          crefito: string | null;
          avatar_path: string | null;
          onboarding_completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name: string;
          phone?: string | null;
          crefito?: string | null;
          avatar_path?: string | null;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string;
          phone?: string | null;
          crefito?: string | null;
          avatar_path?: string | null;
          onboarding_completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      tenant_members: {
        Row: {
          tenant_id: string;
          user_id: string;
          role: string;
          created_at: string;
        };
        Insert: {
          tenant_id: string;
          user_id: string;
          role?: string;
          created_at?: string;
        };
        Update: {
          tenant_id?: string;
          user_id?: string;
          role?: string;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
