export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      app_settings: {
        Row: {
          key: string
          value: boolean
        }
        Insert: {
          key: string
          value?: boolean
        }
        Update: {
          key?: string
          value?: boolean
        }
        Relationships: []
      }
      assessment_results: {
        Row: {
          age_group: string | null
          answers: Json | null
          code: string
          education: string | null
          gender: string | null
          id: string
          max_score: number | null
          question_ids: number[] | null
          score: number | null
          seconds: number | null
          session_code: string | null
          submitted_at: string | null
          test: string
          user_id: string | null
        }
        Insert: {
          age_group?: string | null
          answers?: Json | null
          code: string
          education?: string | null
          gender?: string | null
          id?: string
          max_score?: number | null
          question_ids?: number[] | null
          score?: number | null
          seconds?: number | null
          session_code?: string | null
          submitted_at?: string | null
          test: string
          user_id?: string | null
        }
        Update: {
          age_group?: string | null
          answers?: Json | null
          code?: string
          education?: string | null
          gender?: string | null
          id?: string
          max_score?: number | null
          question_ids?: number[] | null
          score?: number | null
          seconds?: number | null
          session_code?: string | null
          submitted_at?: string | null
          test?: string
          user_id?: string | null
        }
        Relationships: []
      }
      event_media: {
        Row: {
          bytes: number | null
          caption: string
          created_at: string
          event_id: string
          featured: boolean
          height: number | null
          id: string
          kind: string
          path: string
          thumb_path: string
          width: number | null
        }
        Insert: {
          bytes?: number | null
          caption?: string
          created_at?: string
          event_id: string
          featured?: boolean
          height?: number | null
          id?: string
          kind: string
          path: string
          thumb_path?: string
          width?: number | null
        }
        Update: {
          bytes?: number | null
          caption?: string
          created_at?: string
          event_id?: string
          featured?: boolean
          height?: number | null
          id?: string
          kind?: string
          path?: string
          thumb_path?: string
          width?: number | null
        }
        Relationships: []
      }
      events: {
        Row: {
          address: string | null
          code: string
          created_at: string
          event_dates: string[]
          id: string
          is_active: boolean
          name: string
          organized_by: string | null
          package_id: string | null
          post_answers: boolean
          post_open: boolean
          pre_answers: boolean
          pre_open: boolean
          question_ids: number[]
        }
        Insert: {
          address?: string | null
          code: string
          created_at?: string
          event_dates?: string[]
          id?: string
          is_active?: boolean
          name: string
          organized_by?: string | null
          package_id?: string | null
          post_answers?: boolean
          post_open?: boolean
          pre_answers?: boolean
          pre_open?: boolean
          question_ids?: number[]
        }
        Update: {
          address?: string | null
          code?: string
          created_at?: string
          event_dates?: string[]
          id?: string
          is_active?: boolean
          name?: string
          organized_by?: string | null
          package_id?: string | null
          post_answers?: boolean
          post_open?: boolean
          pre_answers?: boolean
          pre_open?: boolean
          question_ids?: number[]
        }
        Relationships: [
          {
            foreignKeyName: "events_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "training_packages"
            referencedColumns: ["id"]
          },
        ]
      }
      exercise_answers: {
        Row: {
          html: string
          key: string
          package_key: string
          updated_at: string
        }
        Insert: {
          html: string
          key: string
          package_key: string
          updated_at?: string
        }
        Update: {
          html?: string
          key?: string
          package_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          age_group: string | null
          created_at: string
          education: string | null
          event_id: string | null
          full_name: string
          gender: string | null
          id: string
          office: string | null
          role: string
          status: string
        }
        Insert: {
          age_group?: string | null
          created_at?: string
          education?: string | null
          event_id?: string | null
          full_name: string
          gender?: string | null
          id: string
          office?: string | null
          role?: string
          status?: string
        }
        Update: {
          age_group?: string | null
          created_at?: string
          education?: string | null
          event_id?: string | null
          full_name?: string
          gender?: string | null
          id?: string
          office?: string | null
          role?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      site_profile: {
        Row: {
          bio: string
          highlights: string[]
          id: number
          linkedin_url: string
          name: string
          organisation: string
          photo_path: string
          title: string
          updated_at: string
        }
        Insert: {
          bio?: string
          highlights?: string[]
          id?: number
          linkedin_url?: string
          name?: string
          organisation?: string
          photo_path?: string
          title?: string
          updated_at?: string
        }
        Update: {
          bio?: string
          highlights?: string[]
          id?: number
          linkedin_url?: string
          name?: string
          organisation?: string
          photo_path?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      training_packages: {
        Row: {
          created_at: string
          id: string
          key: string
          name: string
        }
        Insert: {
          created_at?: string
          id?: string
          key: string
          name: string
        }
        Update: {
          created_at?: string
          id?: string
          key?: string
          name?: string
        }
        Relationships: []
      }
      training_sessions: {
        Row: {
          client: string | null
          code: string
          created_at: string | null
          location: string | null
          session_date: string | null
          test: string | null
        }
        Insert: {
          client?: string | null
          code: string
          created_at?: string | null
          location?: string | null
          session_date?: string | null
          test?: string | null
        }
        Update: {
          client?: string | null
          code?: string
          created_at?: string | null
          location?: string | null
          session_date?: string | null
          test?: string | null
        }
        Relationships: []
      }
      workshop_feedback: {
        Row: {
          best_session: string | null
          created_at: string
          event_code: string
          first_ai_use: string | null
          id: string
          improve: string | null
          ratings: number[]
          recommend: boolean
        }
        Insert: {
          best_session?: string | null
          created_at?: string
          event_code: string
          first_ai_use?: string | null
          id?: string
          improve?: string | null
          ratings: number[]
          recommend?: boolean
        }
        Update: {
          best_session?: string | null
          created_at?: string
          event_code?: string
          first_ai_use?: string | null
          id?: string
          improve?: string | null
          ratings?: number[]
          recommend?: boolean
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      active_event_brand: {
        Args: never
        Returns: {
          address: string
          event_dates: string[]
          name: string
          organized_by: string
          package_key: string
        }[]
      }
      event_exists: { Args: { p_code: string }; Returns: boolean }
      event_question_ids: { Args: { p_code: string }; Returns: number[] }
      event_test_open: {
        Args: { p_code: string; p_test: string }
        Returns: boolean
      }
      is_approved: { Args: never; Returns: boolean }
      is_trainer: { Args: never; Returns: boolean }
      landing_gallery: {
        Args: { p_limit?: number }
        Returns: {
          caption: string
          created_at: string
          event_name: string
          height: number | null
          id: string
          kind: string
          organized_by: string | null
          path: string
          thumb_path: string
          width: number | null
        }[]
      }
      public_event_brand: {
        Args: { p_code: string }
        Returns: {
          address: string
          event_dates: string[]
          organized_by: string
        }[]
      }
      public_event_info: {
        Args: { p_code: string }
        Returns: {
          address: string
          event_dates: string[]
          name: string
          post_answers: boolean
          post_ok: boolean
          pre_answers: boolean
          pre_ok: boolean
          question_ids: number[]
        }[]
      }
      public_review: {
        Args: { p_code: string; p_participant: string; p_test: string }
        Returns: Json
      }
      save_my_profile: {
        Args: {
          p_age_group: string
          p_education: string
          p_full_name: string
          p_gender: string
          p_office: string
        }
        Returns: undefined
      }
      set_active_event: { Args: { p_code: string }; Returns: undefined }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
