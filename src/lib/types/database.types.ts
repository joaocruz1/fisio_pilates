/**
 * Tipos do banco.
 *
 * ⚠️ ESCRITO À MÃO (cobre as tabelas das fases 0–2: tenants, profiles,
 * tenant_members, students, audit_logs). Assim que houver Docker/local stack,
 * REGERAR com `npm run db:types` (`supabase gen types typescript`) para o
 * schema completo e autoritativo. Ver docs/plan/02-banco-de-dados.md.
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
        Row: { tenant_id: string; user_id: string; role: string; created_at: string };
        Insert: { tenant_id: string; user_id: string; role?: string; created_at?: string };
        Update: { tenant_id?: string; user_id?: string; role?: string; created_at?: string };
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      students: {
        Row: {
          id: string;
          tenant_id: string;
          full_name: string;
          birth_date: string | null;
          sex: string | null;
          cpf: string | null;
          phone: string | null;
          email: string | null;
          occupation: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          status: string;
          general_notes: string | null;
          consent_signed_at: string | null;
          consent_version: string | null;
          consent_document_id: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          full_name: string;
          birth_date?: string | null;
          sex?: string | null;
          cpf?: string | null;
          phone?: string | null;
          email?: string | null;
          occupation?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          status?: string;
          general_notes?: string | null;
          consent_signed_at?: string | null;
          consent_version?: string | null;
          consent_document_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          full_name?: string;
          birth_date?: string | null;
          sex?: string | null;
          cpf?: string | null;
          phone?: string | null;
          email?: string | null;
          occupation?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          status?: string;
          general_notes?: string | null;
          consent_signed_at?: string | null;
          consent_version?: string | null;
          consent_document_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "students_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
        ];
      };
      audit_logs: {
        Row: {
          id: number;
          tenant_id: string;
          user_id: string | null;
          action: string;
          entity_type: string;
          entity_id: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: never;
          tenant_id: string;
          user_id?: string | null;
          action: string;
          entity_type: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          tenant_id?: string;
          user_id?: string | null;
          action?: string;
          entity_type?: string;
          entity_id?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
