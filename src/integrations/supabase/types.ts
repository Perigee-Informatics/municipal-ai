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
      app_secrets: {
        Row: {
          created_at: string
          key: string
          value: string
        }
        Insert: {
          created_at?: string
          key: string
          value: string
        }
        Update: {
          created_at?: string
          key?: string
          value?: string
        }
        Relationships: []
      }
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
      appointment_requests: {
        Row: {
          address: string | null
          attachment_path: string | null
          basis: string
          city: string | null
          country: string | null
          created_at: string
          currency: string | null
          description: string | null
          event_title: string
          event_type_id: string | null
          honorarium: number | null
          id: string
          online_link: string | null
          organization: string
          private_notes: string | null
          requester_designation: string | null
          requester_email: string
          requester_name: string
          requester_phone: string | null
          role_id: string | null
          show_publicly: boolean
          status: string
          timezone: string
          updated_at: string
          venue_mode: string
          venue_name: string | null
        }
        Insert: {
          address?: string | null
          attachment_path?: string | null
          basis?: string
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          event_title: string
          event_type_id?: string | null
          honorarium?: number | null
          id?: string
          online_link?: string | null
          organization: string
          private_notes?: string | null
          requester_designation?: string | null
          requester_email: string
          requester_name: string
          requester_phone?: string | null
          role_id?: string | null
          show_publicly?: boolean
          status?: string
          timezone?: string
          updated_at?: string
          venue_mode?: string
          venue_name?: string | null
        }
        Update: {
          address?: string | null
          attachment_path?: string | null
          basis?: string
          city?: string | null
          country?: string | null
          created_at?: string
          currency?: string | null
          description?: string | null
          event_title?: string
          event_type_id?: string | null
          honorarium?: number | null
          id?: string
          online_link?: string | null
          organization?: string
          private_notes?: string | null
          requester_designation?: string | null
          requester_email?: string
          requester_name?: string
          requester_phone?: string | null
          role_id?: string | null
          show_publicly?: boolean
          status?: string
          timezone?: string
          updated_at?: string
          venue_mode?: string
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_requests_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointment_requests_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
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
      certifications: {
        Row: {
          id: string
          issuer: string | null
          kind: string
          name: string
          name_ne: string | null
          sort_order: number
          year: string | null
        }
        Insert: {
          id?: string
          issuer?: string | null
          kind?: string
          name: string
          name_ne?: string | null
          sort_order?: number
          year?: string | null
        }
        Update: {
          id?: string
          issuer?: string | null
          kind?: string
          name?: string
          name_ne?: string | null
          sort_order?: number
          year?: string | null
        }
        Relationships: []
      }
      education: {
        Row: {
          degree: string
          degree_ne: string | null
          id: string
          institution: string
          institution_ne: string | null
          location: string | null
          notes: string | null
          notes_ne: string | null
          sort_order: number
          year: string | null
        }
        Insert: {
          degree: string
          degree_ne?: string | null
          id?: string
          institution: string
          institution_ne?: string | null
          location?: string | null
          notes?: string | null
          notes_ne?: string | null
          sort_order?: number
          year?: string | null
        }
        Update: {
          degree?: string
          degree_ne?: string | null
          id?: string
          institution?: string
          institution_ne?: string | null
          location?: string | null
          notes?: string | null
          notes_ne?: string | null
          sort_order?: number
          year?: string | null
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
      event_types: {
        Row: {
          active: boolean
          id: string
          name: string
          name_ne: string | null
          sort_order: number
        }
        Insert: {
          active?: boolean
          id?: string
          name: string
          name_ne?: string | null
          sort_order?: number
        }
        Update: {
          active?: boolean
          id?: string
          name?: string
          name_ne?: string | null
          sort_order?: number
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
      experience: {
        Row: {
          category: string
          description: string | null
          description_ne: string | null
          end_date: string | null
          id: string
          organization: string
          organization_ne: string | null
          period: string | null
          sort_order: number
          start_date: string | null
          title: string
          title_ne: string | null
        }
        Insert: {
          category?: string
          description?: string | null
          description_ne?: string | null
          end_date?: string | null
          id?: string
          organization: string
          organization_ne?: string | null
          period?: string | null
          sort_order?: number
          start_date?: string | null
          title: string
          title_ne?: string | null
        }
        Update: {
          category?: string
          description?: string | null
          description_ne?: string | null
          end_date?: string | null
          id?: string
          organization?: string
          organization_ne?: string | null
          period?: string | null
          sort_order?: number
          start_date?: string | null
          title?: string
          title_ne?: string | null
        }
        Relationships: []
      }
      expertise: {
        Row: {
          description: string | null
          description_ne: string | null
          id: string
          sort_order: number
          title: string
          title_ne: string | null
        }
        Insert: {
          description?: string | null
          description_ne?: string | null
          id?: string
          sort_order?: number
          title: string
          title_ne?: string | null
        }
        Update: {
          description?: string | null
          description_ne?: string | null
          id?: string
          sort_order?: number
          title?: string
          title_ne?: string | null
        }
        Relationships: []
      }
      google_calendar_auth: {
        Row: {
          calendar_id: string
          connected_email: string | null
          id: number
          refresh_token: string | null
          updated_at: string
          engagements_calendar_id: string | null
          last_pulled_at: string | null
          sync_token: string | null
          use_main: boolean
          watch_channel_id: string | null
          watch_expires_at: string | null
          watch_resource_id: string | null
        }
        Insert: {
          calendar_id?: string
          connected_email?: string | null
          id?: number
          refresh_token?: string | null
          updated_at?: string
          engagements_calendar_id?: string | null
          last_pulled_at?: string | null
          sync_token?: string | null
          use_main?: boolean
          watch_channel_id?: string | null
          watch_expires_at?: string | null
          watch_resource_id?: string | null
        }
        Update: {
          calendar_id?: string
          connected_email?: string | null
          id?: number
          refresh_token?: string | null
          updated_at?: string
          engagements_calendar_id?: string | null
          last_pulled_at?: string | null
          sync_token?: string | null
          use_main?: boolean
          watch_channel_id?: string | null
          watch_expires_at?: string | null
          watch_resource_id?: string | null
        }
        Relationships: []
      }
      highlights: {
        Row: {
          id: string
          label: string
          label_ne: string | null
          sort_order: number
          value: string
        }
        Insert: {
          id?: string
          label: string
          label_ne?: string | null
          sort_order?: number
          value: string
        }
        Update: {
          id?: string
          label?: string
          label_ne?: string | null
          sort_order?: number
          value?: string
        }
        Relationships: []
      }
      profile: {
        Row: {
          cv_path: string | null
          email: string | null
          facebook: string | null
          facebook_followers: string | null
          full_name: string
          full_name_ne: string | null
          google_scholar: string | null
          headline: string | null
          headline_ne: string | null
          id: number
          instagram: string | null
          linkedin: string | null
          linkedin_connections: string | null
          linkedin_followers: string | null
          location: string | null
          long_bio: string | null
          long_bio_ne: string | null
          orcid: string | null
          phone: string | null
          photo_url: string | null
          researchgate: string | null
          short_bio: string | null
          short_bio_ne: string | null
          updated_at: string
          website: string | null
        }
        Insert: {
          cv_path?: string | null
          email?: string | null
          facebook?: string | null
          facebook_followers?: string | null
          full_name: string
          full_name_ne?: string | null
          google_scholar?: string | null
          headline?: string | null
          headline_ne?: string | null
          id?: number
          instagram?: string | null
          linkedin?: string | null
          linkedin_connections?: string | null
          linkedin_followers?: string | null
          location?: string | null
          long_bio?: string | null
          long_bio_ne?: string | null
          orcid?: string | null
          phone?: string | null
          photo_url?: string | null
          researchgate?: string | null
          short_bio?: string | null
          short_bio_ne?: string | null
          updated_at?: string
          website?: string | null
        }
        Update: {
          cv_path?: string | null
          email?: string | null
          facebook?: string | null
          facebook_followers?: string | null
          full_name?: string
          full_name_ne?: string | null
          google_scholar?: string | null
          headline?: string | null
          headline_ne?: string | null
          id?: number
          instagram?: string | null
          linkedin?: string | null
          linkedin_connections?: string | null
          linkedin_followers?: string | null
          location?: string | null
          long_bio?: string | null
          long_bio_ne?: string | null
          orcid?: string | null
          phone?: string | null
          photo_url?: string | null
          researchgate?: string | null
          short_bio?: string | null
          short_bio_ne?: string | null
          updated_at?: string
          website?: string | null
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
      publications: {
        Row: {
          authors: string | null
          id: string
          sort_order: number
          title: string
          url: string | null
          venue: string | null
          year: string | null
        }
        Insert: {
          authors?: string | null
          id?: string
          sort_order?: number
          title: string
          url?: string | null
          venue?: string | null
          year?: string | null
        }
        Update: {
          authors?: string | null
          id?: string
          sort_order?: number
          title?: string
          url?: string | null
          venue?: string | null
          year?: string | null
        }
        Relationships: []
      }
      request_sessions: {
        Row: {
          end_time: string
          google_event_id: string | null
          id: string
          request_id: string
          session_date: string
          start_time: string
        }
        Insert: {
          end_time: string
          google_event_id?: string | null
          id?: string
          request_id: string
          session_date: string
          start_time: string
        }
        Update: {
          end_time?: string
          google_event_id?: string | null
          id?: string
          request_id?: string
          session_date?: string
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "request_sessions_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "appointment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          active: boolean
          id: string
          name: string
          name_ne: string | null
          sort_order: number
        }
        Insert: {
          active?: boolean
          id?: string
          name: string
          name_ne?: string | null
          sort_order?: number
        }
        Update: {
          active?: boolean
          id?: string
          name?: string
          name_ne?: string | null
          sort_order?: number
        }
        Relationships: []
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
      stories: {
        Row: {
          city: string | null
          country: string | null
          cover_media_id: string | null
          created_at: string
          description: string | null
          description_ne: string | null
          end_date: string | null
          event_date: string
          event_type_id: string | null
          facebook_post_url: string | null
          id: string
          is_public: boolean
          latitude: number | null
          location_needs_review: boolean
          longitude: number | null
          organizer: string | null
          role_id: string | null
          source_request_id: string | null
          title: string
          title_ne: string | null
          training_event_id: string | null
          updated_at: string
          end_time: string | null
          google_event_id: string | null
          google_sync: boolean
          google_synced_at: string | null
          online_link: string | null
          private_notes: string | null
          source: string
          start_time: string | null
          venue_mode: string
          venue_name: string | null
        }
        Insert: {
          city?: string | null
          country?: string | null
          cover_media_id?: string | null
          created_at?: string
          description?: string | null
          description_ne?: string | null
          end_date?: string | null
          event_date: string
          event_type_id?: string | null
          facebook_post_url?: string | null
          id?: string
          is_public?: boolean
          latitude?: number | null
          location_needs_review?: boolean
          longitude?: number | null
          organizer?: string | null
          role_id?: string | null
          source_request_id?: string | null
          title: string
          title_ne?: string | null
          training_event_id?: string | null
          updated_at?: string
          end_time?: string | null
          google_event_id?: string | null
          google_sync?: boolean
          google_synced_at?: string | null
          online_link?: string | null
          private_notes?: string | null
          source?: string
          start_time?: string | null
          venue_mode?: string
          venue_name?: string | null
        }
        Update: {
          city?: string | null
          country?: string | null
          cover_media_id?: string | null
          created_at?: string
          description?: string | null
          description_ne?: string | null
          end_date?: string | null
          event_date?: string
          event_type_id?: string | null
          facebook_post_url?: string | null
          id?: string
          is_public?: boolean
          latitude?: number | null
          location_needs_review?: boolean
          longitude?: number | null
          organizer?: string | null
          role_id?: string | null
          source_request_id?: string | null
          title?: string
          title_ne?: string | null
          training_event_id?: string | null
          updated_at?: string
          end_time?: string | null
          google_event_id?: string | null
          google_sync?: boolean
          google_synced_at?: string | null
          online_link?: string | null
          private_notes?: string | null
          source?: string
          start_time?: string | null
          venue_mode?: string
          venue_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stories_training_event_id_fkey"
            columns: ["training_event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_cover_fk"
            columns: ["cover_media_id"]
            isOneToOne: false
            referencedRelation: "story_media"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_event_type_id_fkey"
            columns: ["event_type_id"]
            isOneToOne: false
            referencedRelation: "event_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stories_source_request_id_fkey"
            columns: ["source_request_id"]
            isOneToOne: false
            referencedRelation: "appointment_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      story_media: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          media_type: string
          sort_order: number
          source_url: string | null
          storage_path: string
          story_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          media_type?: string
          sort_order?: number
          source_url?: string | null
          storage_path: string
          story_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          media_type?: string
          sort_order?: number
          source_url?: string | null
          storage_path?: string
          story_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "story_media_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories"
            referencedColumns: ["id"]
          },
        ]
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
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
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
      get_public_events: {
        Args: never
        Returns: {
          city: string | null
          country: string | null
          end_time: string | null
          event_title: string
          event_type: string | null
          event_type_ne: string | null
          id: string
          organization: string
          role: string | null
          role_ne: string | null
          session_date: string
          start_time: string | null
          venue_mode: string
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      recent_request_count: { Args: { _email: string }; Returns: number }
      request_is_fresh: { Args: { _id: string }; Returns: boolean }
      story_is_public: { Args: { _id: string }; Returns: boolean }
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
      public_gallery: {
        Args: { p_limit?: number }
        Returns: {
          bucket: string
          caption: string
          city: string
          created_at: string
          event_date: string
          height: number
          id: string
          kind: string
          organizer: string
          path: string
          source: string
          story_id: string
          story_title: string
          story_title_ne: string
          thumb_path: string
          width: number
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
      app_role: "admin" | "user"
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
    Enums: {
      app_role: ["admin", "user"],
    },
  },
} as const
