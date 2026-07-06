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
      assessments: {
        Row: {
          id: string;
          tenant_id: string;
          student_id: string;
          kind: string;
          assessed_at: string;
          main_complaint: string | null;
          clinical_diagnosis: string | null;
          goals: string[] | null;
          pain_level_initial: number | null;
          anamnesis: Json;
          postural_assessment: Json;
          physical_tests: Json;
          contraindications: string[] | null;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          student_id: string;
          kind?: string;
          assessed_at?: string;
          main_complaint?: string | null;
          clinical_diagnosis?: string | null;
          goals?: string[] | null;
          pain_level_initial?: number | null;
          anamnesis?: Json;
          postural_assessment?: Json;
          physical_tests?: Json;
          contraindications?: string[] | null;
          notes?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          kind?: string;
          assessed_at?: string;
          main_complaint?: string | null;
          clinical_diagnosis?: string | null;
          goals?: string[] | null;
          pain_level_initial?: number | null;
          anamnesis?: Json;
          postural_assessment?: Json;
          physical_tests?: Json;
          contraindications?: string[] | null;
          notes?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      student_conditions: {
        Row: {
          id: string;
          tenant_id: string;
          student_id: string;
          name: string;
          cid_code: string | null;
          status: string;
          severity: string | null;
          notes: string | null;
          diagnosed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          student_id: string;
          name: string;
          cid_code?: string | null;
          status?: string;
          severity?: string | null;
          notes?: string | null;
          diagnosed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          cid_code?: string | null;
          status?: string;
          severity?: string | null;
          notes?: string | null;
          diagnosed_at?: string | null;
        };
        Relationships: [];
      };
      exercises: {
        Row: {
          id: string;
          tenant_id: string | null;
          name: string;
          apparatus: string;
          category: string | null;
          difficulty: string | null;
          description: string | null;
          muscle_groups: string[] | null;
          contraindications: string[] | null;
          media_path: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          name: string;
          apparatus?: string;
          category?: string | null;
          difficulty?: string | null;
          description?: string | null;
          muscle_groups?: string[] | null;
          contraindications?: string[] | null;
          media_path?: string | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          apparatus?: string;
          category?: string | null;
          difficulty?: string | null;
          description?: string | null;
          muscle_groups?: string[] | null;
          contraindications?: string[] | null;
          media_path?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      sessions: {
        Row: {
          id: string;
          tenant_id: string;
          student_id: string;
          session_date: string;
          start_time: string | null;
          duration_min: number | null;
          status: string;
          pain_level_pre: number | null;
          pain_level_post: number | null;
          focus: string | null;
          notes: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          student_id: string;
          session_date?: string;
          start_time?: string | null;
          duration_min?: number | null;
          status?: string;
          pain_level_pre?: number | null;
          pain_level_post?: number | null;
          focus?: string | null;
          notes?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          session_date?: string;
          start_time?: string | null;
          duration_min?: number | null;
          status?: string;
          pain_level_pre?: number | null;
          pain_level_post?: number | null;
          focus?: string | null;
          notes?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      session_exercises: {
        Row: {
          id: string;
          tenant_id: string;
          session_id: string;
          exercise_id: string;
          order_index: number;
          sets: number | null;
          reps: number | null;
          load_springs: string | null;
          load_kg: number | null;
          resistance_level: number | null;
          difficulty_felt: number | null;
          quality_rating: number | null;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          session_id: string;
          exercise_id: string;
          order_index?: number;
          sets?: number | null;
          reps?: number | null;
          load_springs?: string | null;
          load_kg?: number | null;
          resistance_level?: number | null;
          difficulty_felt?: number | null;
          quality_rating?: number | null;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          order_index?: number;
          sets?: number | null;
          reps?: number | null;
          load_springs?: string | null;
          load_kg?: number | null;
          resistance_level?: number | null;
          difficulty_felt?: number | null;
          quality_rating?: number | null;
          notes?: string | null;
        };
        Relationships: [];
      };
      body_measurements: {
        Row: {
          id: string;
          tenant_id: string;
          student_id: string;
          measured_at: string;
          weight_kg: number | null;
          height_cm: number | null;
          circumferences: Json;
          flexibility: Json;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          student_id: string;
          measured_at?: string;
          weight_kg?: number | null;
          height_cm?: number | null;
          circumferences?: Json;
          flexibility?: Json;
          notes?: string | null;
          created_at?: string;
        };
        Update: {
          measured_at?: string;
          weight_kg?: number | null;
          height_cm?: number | null;
          circumferences?: Json;
          flexibility?: Json;
          notes?: string | null;
        };
        Relationships: [];
      };
      documents: {
        Row: {
          id: string;
          tenant_id: string;
          student_id: string | null;
          kind: string;
          bucket: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          taken_at: string | null;
          description: string | null;
          extracted_text: string | null;
          uploaded_by: string;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          student_id?: string | null;
          kind?: string;
          bucket?: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          taken_at?: string | null;
          description?: string | null;
          extracted_text?: string | null;
          uploaded_by: string;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          kind?: string;
          taken_at?: string | null;
          description?: string | null;
          extracted_text?: string | null;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      kb_documents: {
        Row: {
          id: string;
          tenant_id: string | null;
          scope: string;
          title: string;
          author: string | null;
          storage_path: string;
          source_type: string;
          license_note: string | null;
          embedding_model: string | null;
          status: string;
          total_pages: number | null;
          processed_pages: number;
          chunk_count: number;
          error_message: string | null;
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id?: string | null;
          scope: string;
          title: string;
          author?: string | null;
          storage_path: string;
          source_type?: string;
          license_note?: string | null;
          embedding_model?: string | null;
          status?: string;
          total_pages?: number | null;
          processed_pages?: number;
          chunk_count?: number;
          error_message?: string | null;
          created_by: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          title?: string;
          author?: string | null;
          license_note?: string | null;
          embedding_model?: string | null;
          status?: string;
          total_pages?: number | null;
          processed_pages?: number;
          chunk_count?: number;
          error_message?: string | null;
        };
        Relationships: [];
      };
      kb_chunks: {
        Row: {
          id: number;
          document_id: string;
          tenant_id: string | null;
          scope: string;
          content: string;
          context_header: string | null;
          page_start: number | null;
          page_end: number | null;
          token_count: number | null;
          created_at: string;
        };
        Insert: {
          id?: never;
          document_id: string;
          tenant_id?: string | null;
          scope: string;
          content: string;
          context_header?: string | null;
          page_start?: number | null;
          page_end?: number | null;
          token_count?: number | null;
          embedding: string;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      ai_reports: {
        Row: {
          id: string;
          tenant_id: string;
          student_id: string;
          report_type: string;
          period_start: string | null;
          period_end: string | null;
          status: string;
          model: string | null;
          structured: Json;
          content_md: string | null;
          input_snapshot: Json;
          input_hash: string;
          citations: Json;
          usage: Json;
          error_message: string | null;
          approved_at: string | null;
          requested_by: string;
          created_at: string;
          completed_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          student_id: string;
          report_type: string;
          period_start?: string | null;
          period_end?: string | null;
          status?: string;
          model?: string | null;
          structured?: Json;
          content_md?: string | null;
          input_snapshot?: Json;
          input_hash: string;
          citations?: Json;
          usage?: Json;
          error_message?: string | null;
          approved_at?: string | null;
          requested_by: string;
          created_at?: string;
          completed_at?: string | null;
        };
        Update: {
          status?: string;
          model?: string | null;
          structured?: Json;
          content_md?: string | null;
          input_snapshot?: Json;
          citations?: Json;
          usage?: Json;
          error_message?: string | null;
          approved_at?: string | null;
          completed_at?: string | null;
        };
        Relationships: [];
      };
      ai_usage_log: {
        Row: {
          id: number;
          tenant_id: string;
          user_id: string | null;
          kind: string;
          model: string | null;
          input_tokens: number | null;
          output_tokens: number | null;
          cost_usd: number | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: never;
          tenant_id: string;
          user_id?: string | null;
          kind: string;
          model?: string | null;
          input_tokens?: number | null;
          output_tokens?: number | null;
          cost_usd?: number | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
      chat_conversations: {
        Row: {
          id: string;
          tenant_id: string;
          user_id: string;
          student_id: string | null;
          title: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          user_id: string;
          student_id?: string | null;
          title?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          student_id?: string | null;
          title?: string | null;
        };
        Relationships: [];
      };
      chat_messages: {
        Row: {
          id: string;
          conversation_id: string;
          tenant_id: string;
          user_id: string;
          role: string;
          parts: Json;
          citations: Json;
          usage: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          tenant_id: string;
          user_id: string;
          role: string;
          parts?: Json;
          citations?: Json;
          usage?: Json;
          created_at?: string;
        };
        Update: never;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      match_kb_chunks: {
        Args: {
          query_embedding: string;
          query_text: string;
          p_tenant_id: string | null;
          match_count?: number;
          rrf_k?: number;
          semantic_weight?: number;
          full_text_weight?: number;
        };
        Returns: {
          id: number;
          document_id: string;
          content: string;
          context_header: string | null;
          page_start: number | null;
          similarity: number;
          rrf_score: number;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
