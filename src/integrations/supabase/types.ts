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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      categories: {
        Row: {
          created_at: string
          game_id: string
          id: string
          max_picks: number
          name: string
          order_index: number | null
          short_name: string | null
          sort_order: number
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          max_picks?: number
          name: string
          order_index?: number | null
          short_name?: string | null
          sort_order?: number
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          max_picks?: number
          name?: string
          order_index?: number | null
          short_name?: string | null
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      category_riders: {
        Row: {
          category_id: string
          created_at: string
          id: string
          rider_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          rider_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          rider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_riders_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "category_riders_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_message_reactions: {
        Row: {
          created_at: string
          emoji: string
          id: string
          message_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji: string
          id?: string
          message_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          message_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_message_reactions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          body: string
          created_at: string
          deleted_at: string | null
          edited_at: string | null
          game_id: string
          id: string
          mentions: string[]
          subpoule_id: string | null
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          game_id: string
          id?: string
          mentions?: string[]
          subpoule_id?: string | null
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          deleted_at?: string | null
          edited_at?: string | null
          game_id?: string
          id?: string
          mentions?: string[]
          subpoule_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      chat_poll_votes: {
        Row: {
          created_at: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          option_index: number
          poll_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          option_index?: number
          poll_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_poll_votes_poll_id_fkey"
            columns: ["poll_id"]
            isOneToOne: false
            referencedRelation: "chat_polls"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_polls: {
        Row: {
          created_at: string
          created_by: string
          deadline: string | null
          id: string
          message_id: string | null
          options: Json
          question: string
          subpoule_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          deadline?: string | null
          id?: string
          message_id?: string | null
          options: Json
          question: string
          subpoule_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          deadline?: string | null
          id?: string
          message_id?: string | null
          options?: Json
          question?: string
          subpoule_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_polls_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_read_states: {
        Row: {
          last_read_at: string
          subpoule_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          last_read_at?: string
          subpoule_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          last_read_at?: string
          subpoule_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      entries: {
        Row: {
          created_at: string
          game_id: string
          id: string
          status: string
          submitted_at: string | null
          team_name: string | null
          total_points: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          game_id: string
          id?: string
          status?: string
          submitted_at?: string | null
          team_name?: string | null
          total_points?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          game_id?: string
          id?: string
          status?: string
          submitted_at?: string | null
          team_name?: string | null
          total_points?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entries_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_jokers: {
        Row: {
          created_at: string
          entry_id: string
          id: string
          rider_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          id?: string
          rider_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          id?: string
          rider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_jokers_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_jokers_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_picks: {
        Row: {
          category_id: string
          created_at: string
          entry_id: string
          id: string
          rider_id: string
        }
        Insert: {
          category_id: string
          created_at?: string
          entry_id: string
          id?: string
          rider_id: string
        }
        Update: {
          category_id?: string
          created_at?: string
          entry_id?: string
          id?: string
          rider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_picks_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_picks_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entry_picks_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_prediction_points: {
        Row: {
          classification: string
          entry_id: string
          id: string
          points: number
          position: number
          updated_at: string
        }
        Insert: {
          classification: string
          entry_id: string
          id?: string
          points?: number
          position: number
          updated_at?: string
        }
        Update: {
          classification?: string
          entry_id?: string
          id?: string
          points?: number
          position?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_prediction_points_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
        ]
      }
      entry_predictions: {
        Row: {
          classification: string
          created_at: string
          entry_id: string
          id: string
          position: number
          rider_id: string
        }
        Insert: {
          classification: string
          created_at?: string
          entry_id: string
          id?: string
          position: number
          rider_id: string
        }
        Update: {
          classification?: string
          created_at?: string
          entry_id?: string
          id?: string
          position?: number
          rider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entry_predictions_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
        ]
      }
      game_riders: {
        Row: {
          category_id: string | null
          created_at: string
          game_id: string
          id: string
          rider_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          game_id: string
          id?: string
          rider_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          game_id?: string
          id?: string
          rider_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "game_riders_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_riders_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "game_riders_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
        ]
      }
      games: {
        Row: {
          created_at: string
          deadline: string | null
          end_date: string | null
          game_type: string | null
          id: string
          name: string
          registration_closes_at: string | null
          registration_opens_at: string | null
          slug: string | null
          start_date: string | null
          starts_at: string | null
          status: string
          year: number
        }
        Insert: {
          created_at?: string
          deadline?: string | null
          end_date?: string | null
          game_type?: string | null
          id?: string
          name: string
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          slug?: string | null
          start_date?: string | null
          starts_at?: string | null
          status?: string
          year: number
        }
        Update: {
          created_at?: string
          deadline?: string | null
          end_date?: string | null
          game_type?: string | null
          id?: string
          name?: string
          registration_closes_at?: string | null
          registration_opens_at?: string | null
          slug?: string | null
          start_date?: string | null
          starts_at?: string | null
          status?: string
          year?: number
        }
        Relationships: []
      }
      notify_subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          source: string | null
          unsubscribed_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          source?: string | null
          unsubscribed_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          source?: string | null
          unsubscribed_at?: string | null
        }
        Relationships: []
      }
      points_schema: {
        Row: {
          classification: string
          game_id: string
          id: string
          points: number
          position: number
        }
        Insert: {
          classification: string
          game_id: string
          id?: string
          points: number
          position: number
        }
        Update: {
          classification?: string
          game_id?: string
          id?: string
          points?: number
          position?: number
        }
        Relationships: [
          {
            foreignKeyName: "points_schema_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string | null
          id: string
          is_admin: boolean
          role: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string | null
          id: string
          is_admin?: boolean
          role?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string | null
          id?: string
          is_admin?: boolean
          role?: string
          updated_at?: string
        }
        Relationships: []
      }
      results_approval_log: {
        Row: {
          action: string
          actor_display_name: string | null
          actor_user_id: string | null
          created_at: string
          id: string
          note: string | null
          stage_id: string
        }
        Insert: {
          action: string
          actor_display_name?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          stage_id: string
        }
        Update: {
          action?: string
          actor_display_name?: string | null
          actor_user_id?: string | null
          created_at?: string
          id?: string
          note?: string | null
          stage_id?: string
        }
        Relationships: []
      }
      riders: {
        Row: {
          country_code: string | null
          created_at: string
          game_id: string | null
          id: string
          is_youth_eligible: boolean
          name: string
          start_number: number | null
          team: string | null
          team_id: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          game_id?: string | null
          id?: string
          is_youth_eligible?: boolean
          name: string
          start_number?: number | null
          team?: string | null
          team_id?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          game_id?: string | null
          id?: string
          is_youth_eligible?: boolean
          name?: string
          start_number?: number | null
          team?: string | null
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "riders_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riders_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_points: {
        Row: {
          created_at: string
          entry_id: string
          id: string
          points: number
          stage_id: string
        }
        Insert: {
          created_at?: string
          entry_id: string
          id?: string
          points?: number
          stage_id: string
        }
        Update: {
          created_at?: string
          entry_id?: string
          id?: string
          points?: number
          stage_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "stage_points_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: false
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_points_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      stage_results: {
        Row: {
          created_at: string
          did_finish: boolean | null
          finish_position: number | null
          game_id: string | null
          gc_position: number | null
          id: string
          mountain_position: number | null
          points_position: number | null
          rider_id: string
          rider_name: string | null
          stage_id: string
          start_number: number | null
          youth_position: number | null
        }
        Insert: {
          created_at?: string
          did_finish?: boolean | null
          finish_position?: number | null
          game_id?: string | null
          gc_position?: number | null
          id?: string
          mountain_position?: number | null
          points_position?: number | null
          rider_id: string
          rider_name?: string | null
          stage_id: string
          start_number?: number | null
          youth_position?: number | null
        }
        Update: {
          created_at?: string
          did_finish?: boolean | null
          finish_position?: number | null
          game_id?: string | null
          gc_position?: number | null
          id?: string
          mountain_position?: number | null
          points_position?: number | null
          rider_id?: string
          rider_name?: string | null
          stage_id?: string
          start_number?: number | null
          youth_position?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stage_results_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_results_rider_id_fkey"
            columns: ["rider_id"]
            isOneToOne: false
            referencedRelation: "riders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stage_results_stage_id_fkey"
            columns: ["stage_id"]
            isOneToOne: false
            referencedRelation: "stages"
            referencedColumns: ["id"]
          },
        ]
      }
      stages: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          created_at: string
          date: string | null
          distance_km: number | null
          game_id: string
          id: string
          is_gc: boolean
          name: string | null
          results_status: string
          stage_number: number
          stage_type: Database["public"]["Enums"]["stage_type_enum"]
          status: string | null
          submitted_for_approval_at: string | null
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          date?: string | null
          distance_km?: number | null
          game_id: string
          id?: string
          is_gc?: boolean
          name?: string | null
          results_status?: string
          stage_number: number
          stage_type?: Database["public"]["Enums"]["stage_type_enum"]
          status?: string | null
          submitted_for_approval_at?: string | null
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          date?: string | null
          distance_km?: number | null
          game_id?: string
          id?: string
          is_gc?: boolean
          name?: string | null
          results_status?: string
          stage_number?: number
          stage_type?: Database["public"]["Enums"]["stage_type_enum"]
          status?: string | null
          submitted_for_approval_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "stages_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      startlists: {
        Row: {
          game_id: string
          id: string
          imported_at: string
          raw: Json | null
          source: string | null
        }
        Insert: {
          game_id: string
          id?: string
          imported_at?: string
          raw?: Json | null
          source?: string | null
        }
        Update: {
          game_id?: string
          id?: string
          imported_at?: string
          raw?: Json | null
          source?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "startlists_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      subpoule_members: {
        Row: {
          id: string
          joined_at: string
          subpoule_id: string
          user_id: string
        }
        Insert: {
          id?: string
          joined_at?: string
          subpoule_id: string
          user_id: string
        }
        Update: {
          id?: string
          joined_at?: string
          subpoule_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subpoule_members_subpoule_id_fkey"
            columns: ["subpoule_id"]
            isOneToOne: false
            referencedRelation: "subpoules"
            referencedColumns: ["id"]
          },
        ]
      }
      subpoules: {
        Row: {
          code: string
          created_at: string
          game_id: string
          id: string
          name: string
          owner_user_id: string
        }
        Insert: {
          code: string
          created_at?: string
          game_id: string
          id?: string
          name: string
          owner_user_id: string
        }
        Update: {
          code?: string
          created_at?: string
          game_id?: string
          id?: string
          name?: string
          owner_user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "subpoules_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      teams: {
        Row: {
          country_code: string | null
          created_at: string
          game_id: string | null
          id: string
          name: string
          short_name: string | null
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          game_id?: string | null
          id?: string
          name: string
          short_name?: string | null
        }
        Update: {
          country_code?: string | null
          created_at?: string
          game_id?: string | null
          id?: string
          name?: string
          short_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "teams_game_id_fkey"
            columns: ["game_id"]
            isOneToOne: false
            referencedRelation: "games"
            referencedColumns: ["id"]
          },
        ]
      }
      total_points: {
        Row: {
          entry_id: string
          total_points: number
          updated_at: string
        }
        Insert: {
          entry_id: string
          total_points?: number
          updated_at?: string
        }
        Update: {
          entry_id?: string
          total_points?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "total_points_entry_id_fkey"
            columns: ["entry_id"]
            isOneToOne: true
            referencedRelation: "entries"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      admin_entries_overview: {
        Row: {
          created_at: string | null
          display_name: string | null
          email: string | null
          entry_id: string | null
          entry_status: string | null
          game_id: string | null
          jokers_count: number | null
          picks_count: number | null
          submitted_at: string | null
          team_name: string | null
          total_points: number | null
          user_id: string | null
        }
        Relationships: []
      }
      admin_user_overview: {
        Row: {
          created_at: string | null
          email: string | null
          is_admin: boolean | null
          teams_count: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_delete_entry: { Args: { p_entry_id: string }; Returns: undefined }
      admin_delete_user_data: {
        Args: { p_user_id: string }
        Returns: undefined
      }
      admin_entries_overview: {
        Args: never
        Returns: {
          created_at: string
          display_name: string
          email: string
          entry_id: string
          entry_status: string
          game_id: string
          jokers_count: number
          picks_count: number
          submitted_at: string
          team_name: string
          total_points: number
          user_id: string
        }[]
      }
      admin_list_notify_subscribers: {
        Args: never
        Returns: {
          created_at: string
          email: string
          id: string
          source: string
          unsubscribed_at: string
        }[]
      }
      admin_pending_approvals: {
        Args: { p_game_id: string }
        Returns: {
          approved_at: string
          approved_by: string
          approved_by_name: string
          results_status: string
          stage_date: string
          stage_id: string
          stage_name: string
          stage_number: number
          submitted_for_approval_at: string
        }[]
      }
      admin_stage_points_breakdown: {
        Args: { p_stage_id: string }
        Returns: {
          breakdown: Json
          display_name: string
          entry_id: string
          team_name: string
          total_stage_points: number
        }[]
      }
      admin_update_entry_status: {
        Args: { p_entry_id: string; p_status: string }
        Returns: undefined
      }
      admin_user_overview: {
        Args: never
        Returns: {
          created_at: string
          email: string
          is_admin: boolean
          teams_count: number
          user_id: string
        }[]
      }
      approve_stage_results: {
        Args: { p_stage_id: string }
        Returns: undefined
      }
      assign_admin_role: {
        Args: { p_make_admin: boolean; p_user_id: string }
        Returns: undefined
      }
      calculate_prediction_points: {
        Args: { p_game_id: string }
        Returns: undefined
      }
      calculate_stage_scores: {
        Args: { p_stage_id: string }
        Returns: undefined
      }
      cast_chat_poll_vote: {
        Args: { p_option_index: number; p_poll_id: string }
        Returns: undefined
      }
      create_chat_poll: {
        Args: {
          p_deadline: string
          p_game_id: string
          p_options: Json
          p_question: string
          p_subpoule_id: string
        }
        Returns: string
      }
      create_subpoule: {
        Args: { p_code: string; p_game_id: string; p_name: string }
        Returns: string
      }
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      delete_stage_results: { Args: { p_stage_id: string }; Returns: undefined }
      delete_subpoule: { Args: { p_subpoule_id: string }; Returns: undefined }
      edit_chat_message: {
        Args: { p_body: string; p_message_id: string }
        Returns: undefined
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      full_recalculation: { Args: { p_game_id: string }; Returns: undefined }
      game_benchmark_data: { Args: { p_game_id: string }; Returns: Json }
      game_entries_standings: {
        Args: { p_game_id: string }
        Returns: {
          display_name: string
          id: string
          team_name: string
          total_points: number
          user_id: string
        }[]
      }
      game_entry_totals: {
        Args: { p_game_id: string }
        Returns: {
          total_points: number
        }[]
      }
      game_joker_stats: {
        Args: { p_game_id: string }
        Returns: {
          joker_count: number
          rider_id: string
          total_entries: number
        }[]
      }
      game_pick_stats: {
        Args: { p_game_id: string }
        Returns: {
          category_id: string
          pick_count: number
          rider_id: string
          total_entries: number
        }[]
      }
      game_prediction_stats: {
        Args: { p_game_id: string }
        Returns: {
          classification: string
          pick_count: number
          position: number
          rider_id: string
          total_entries: number
        }[]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_subpoule_member: {
        Args: { _subpoule_id: string; _user_id: string }
        Returns: boolean
      }
      join_subpoule: { Args: { p_code: string }; Returns: string }
      leave_subpoule: { Args: { p_subpoule_id: string }; Returns: undefined }
      mark_subpoule_read: {
        Args: { p_subpoule_id: string }
        Returns: undefined
      }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      remove_subpoule_member: {
        Args: { p_subpoule_id: string; p_user_id: string }
        Returns: undefined
      }
      revert_stage_to_draft: {
        Args: { p_stage_id: string }
        Returns: undefined
      }
      revoke_stage_approval: {
        Args: { p_stage_id: string }
        Returns: undefined
      }
      save_entry_jokers: {
        Args: { p_entry_id: string; p_rider_ids: string[] }
        Returns: undefined
      }
      save_entry_pick: {
        Args: { p_category_id: string; p_entry_id: string; p_rider_id: string }
        Returns: undefined
      }
      save_entry_predictions: {
        Args: { p_entry_id: string; p_predictions: Json }
        Returns: undefined
      }
      seed_default_points_schema: {
        Args: { p_game_id: string }
        Returns: undefined
      }
      soft_delete_chat_message: {
        Args: { p_message_id: string }
        Returns: undefined
      }
      submit_entry: { Args: { p_entry_id: string }; Returns: undefined }
      submit_stage_for_approval: {
        Args: { p_stage_id: string }
        Returns: undefined
      }
      subpoule_benchmark_data: {
        Args: { p_game_id: string; p_subpoule_id: string }
        Returns: Json
      }
      subpoule_entries_detail: {
        Args: { p_game_id: string; p_subpoule_id: string }
        Returns: {
          display_name: string
          entry_id: string
          jokers: Json
          picks: Json
          predictions: Json
          team_name: string
          total_points: number
          user_id: string
        }[]
      }
      subpoule_unread_counts: {
        Args: { p_game_id: string }
        Returns: {
          subpoule_id: string
          unread_count: number
        }[]
      }
      subscribe_notify: {
        Args: { p_email: string; p_source?: string }
        Returns: undefined
      }
      toggle_chat_reaction: {
        Args: { p_emoji: string; p_message_id: string }
        Returns: undefined
      }
      toggle_entry_pick: {
        Args: { p_category_id: string; p_entry_id: string; p_rider_id: string }
        Returns: undefined
      }
      update_total_ranking: { Args: { p_game_id: string }; Returns: undefined }
    }
    Enums: {
      app_role: "user" | "admin"
      stage_type_enum:
        | "vlak"
        | "heuvelachtig"
        | "tijdrit"
        | "bergop"
        | "ploegentijdrit"
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
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
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
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
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
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
      app_role: ["user", "admin"],
      stage_type_enum: [
        "vlak",
        "heuvelachtig",
        "tijdrit",
        "bergop",
        "ploegentijdrit",
      ],
    },
  },
} as const
