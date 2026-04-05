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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      cards: {
        Row: {
          card_number: number
          created_at: string
          id: string
          image_status: number | null
          image_url: string | null
          link: string | null
          name: string | null
          primary_category: string | null
          regulation_mark: string | null
          secondary_category: string | null
          set_id: string
        }
        Insert: {
          card_number: number
          created_at?: string
          id?: string
          image_status?: number | null
          image_url?: string | null
          link?: string | null
          name?: string | null
          primary_category?: string | null
          regulation_mark?: string | null
          secondary_category?: string | null
          set_id: string
        }
        Update: {
          card_number?: number
          created_at?: string
          id?: string
          image_status?: number | null
          image_url?: string | null
          link?: string | null
          name?: string | null
          primary_category?: string | null
          regulation_mark?: string | null
          secondary_category?: string | null
          set_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "cards_set_id_fkey"
            columns: ["set_id"]
            isOneToOne: false
            referencedRelation: "sets"
            referencedColumns: ["id"]
          },
        ]
      }
      deck_checks: {
        Row: {
          check_time: string | null
          id: string
          judge_user_id: string
          note: string | null
          player_id: string
          round_number: number
          tournament_id: string
        }
        Insert: {
          check_time?: string | null
          id?: string
          judge_user_id: string
          note?: string | null
          player_id: string
          round_number: number
          tournament_id: string
        }
        Update: {
          check_time?: string | null
          id?: string
          judge_user_id?: string
          note?: string | null
          player_id?: string
          round_number?: number
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "deck_checks_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      deck_list_cards: {
        Row: {
          card_id: string
          category: string | null
          deck_list_id: string
          id: string
          quantity: number
        }
        Insert: {
          card_id: string
          category?: string | null
          deck_list_id: string
          id?: string
          quantity: number
        }
        Update: {
          card_id?: string
          category?: string | null
          deck_list_id?: string
          id?: string
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "deck_list_cards_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deck_list_cards_deck_list_id_fkey"
            columns: ["deck_list_id"]
            isOneToOne: false
            referencedRelation: "deck_lists"
            referencedColumns: ["id"]
          },
        ]
      }
      deck_lists: {
        Row: {
          id: string
          player_id: string
          raw_text: string
          submitted_at: string | null
          tournament_id: string
          validation_errors: Json | null
          validation_status: string | null
        }
        Insert: {
          id?: string
          player_id: string
          raw_text: string
          submitted_at?: string | null
          tournament_id: string
          validation_errors?: Json | null
          validation_status?: string | null
        }
        Update: {
          id?: string
          player_id?: string
          raw_text?: string
          submitted_at?: string | null
          tournament_id?: string
          validation_errors?: Json | null
          validation_status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deck_lists_tournament_id_player_id_fkey"
            columns: ["tournament_id", "player_id"]
            isOneToOne: true
            referencedRelation: "tournament_players"
            referencedColumns: ["tournament_id", "player_id"]
          },
        ]
      }
      equivalency_groups: {
        Row: {
          created_at: string | null
          id: number
          name: string
          notes: string | null
          source: string | null
        }
        Insert: {
          created_at?: string | null
          id?: number
          name: string
          notes?: string | null
          source?: string | null
        }
        Update: {
          created_at?: string | null
          id?: number
          name?: string
          notes?: string | null
          source?: string | null
        }
        Relationships: []
      }
      equivalency_members: {
        Row: {
          card_id: string
          confidence: number | null
          group_id: number
        }
        Insert: {
          card_id: string
          confidence?: number | null
          group_id: number
        }
        Update: {
          card_id?: string
          confidence?: number | null
          group_id?: number
        }
        Relationships: [
          {
            foreignKeyName: "equivalency_members_card_id_fkey"
            columns: ["card_id"]
            isOneToOne: false
            referencedRelation: "cards"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equivalency_members_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "equivalency_groups"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          division: string | null
          id: string
          is_finished: boolean
          outcome: number | null
          p1_display_record: string | null
          p1_reported_result: string | null
          p2_display_record: string | null
          p2_reported_result: string | null
          player1_tom_id: string
          player1_win: string | null
          player2_tom_id: string | null
          player2_win: string | null
          round_number: number
          table_number: number
          tie: string | null
          time_extension_minutes: number | null
          tournament_id: string
          winner_tom_id: string | null
        }
        Insert: {
          division?: string | null
          id?: string
          is_finished?: boolean
          outcome?: number | null
          p1_display_record?: string | null
          p1_reported_result?: string | null
          p2_display_record?: string | null
          p2_reported_result?: string | null
          player1_tom_id: string
          player1_win?: string | null
          player2_tom_id?: string | null
          player2_win?: string | null
          round_number: number
          table_number: number
          tie?: string | null
          time_extension_minutes?: number | null
          tournament_id: string
          winner_tom_id?: string | null
        }
        Update: {
          division?: string | null
          id?: string
          is_finished?: boolean
          outcome?: number | null
          p1_display_record?: string | null
          p1_reported_result?: string | null
          p2_display_record?: string | null
          p2_reported_result?: string | null
          player1_tom_id?: string
          player1_win?: string | null
          player2_tom_id?: string | null
          player2_win?: string | null
          round_number?: number
          table_number?: number
          tie?: string | null
          time_extension_minutes?: number | null
          tournament_id?: string
          winner_tom_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_player1_tom_id_fkey"
            columns: ["player1_tom_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["tom_player_id"]
          },
          {
            foreignKeyName: "matches_player2_tom_id_fkey"
            columns: ["player2_tom_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["tom_player_id"]
          },
          {
            foreignKeyName: "matches_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_winner_tom_id_fkey"
            columns: ["winner_tom_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["tom_player_id"]
          },
        ]
      }
      mini_games: {
        Row: {
          board: Json
          match_id: string
          turn: string
          winner: string | null
        }
        Insert: {
          board?: Json
          match_id: string
          turn: string
          winner?: string | null
        }
        Update: {
          board?: Json
          match_id?: string
          turn?: string
          winner?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "mini_games_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      player_penalties: {
        Row: {
          category: string
          created_at: string | null
          id: string
          judge_user_id: string
          notes: string | null
          penalty: string
          player_id: string
          round_number: number
          severity: string
          tournament_id: string
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          judge_user_id: string
          notes?: string | null
          penalty: string
          player_id: string
          round_number: number
          severity: string
          tournament_id: string
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          judge_user_id?: string
          notes?: string | null
          penalty?: string
          player_id?: string
          round_number?: number
          severity?: string
          tournament_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "player_penalties_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      players: {
        Row: {
          first_name: string
          id: string
          last_name: string
          tom_player_id: string
        }
        Insert: {
          first_name: string
          id?: string
          last_name: string
          tom_player_id: string
        }
        Update: {
          first_name?: string
          id?: string
          last_name?: string
          tom_player_id?: string
        }
        Relationships: []
      }
      processed_payment_webhooks: {
        Row: {
          created_at: string | null
          player_id: string
          tournament_id: string
          webhook_id: string
        }
        Insert: {
          created_at?: string | null
          player_id: string
          tournament_id: string
          webhook_id: string
        }
        Update: {
          created_at?: string | null
          player_id?: string
          tournament_id?: string
          webhook_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "processed_payment_webhooks_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          birth_year: number | null
          created_at: string
          email: string | null
          first_name: string | null
          id: string
          last_name: string | null
          middle_name: string | null
          nick_name: string | null
          pokemon_player_id: string | null
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string | null
        }
        Insert: {
          birth_year?: number | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          middle_name?: string | null
          nick_name?: string | null
          pokemon_player_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Update: {
          birth_year?: number | null
          created_at?: string
          email?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          middle_name?: string | null
          nick_name?: string | null
          pokemon_player_id?: string | null
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string | null
        }
        Relationships: []
      }
      sets: {
        Row: {
          card_count: number | null
          code: string
          created_at: string
          era: string | null
          id: string
          link: string | null
          name: string
          release_date: string | null
        }
        Insert: {
          card_count?: number | null
          code: string
          created_at?: string
          era?: string | null
          id?: string
          link?: string | null
          name: string
          release_date?: string | null
        }
        Update: {
          card_count?: number | null
          code?: string
          created_at?: string
          era?: string | null
          id?: string
          link?: string | null
          name?: string
          release_date?: string | null
        }
        Relationships: []
      }
      tournament_judges: {
        Row: {
          assigned_at: string | null
          tournament_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string | null
          tournament_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string | null
          tournament_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tournament_judges_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tournament_judges_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_players: {
        Row: {
          created_at: string
          deck_reminder_sent_at: string | null
          division: string | null
          losses: number | null
          payment_callback_token: string | null
          payment_pending_since: string | null
          player_id: string
          points: number | null
          queue_promoted_at: string | null
          rank: number | null
          registration_status: string | null
          ties: number | null
          tournament_id: string
          wins: number | null
        }
        Insert: {
          created_at?: string
          deck_reminder_sent_at?: string | null
          division?: string | null
          losses?: number | null
          payment_callback_token?: string | null
          payment_pending_since?: string | null
          player_id: string
          points?: number | null
          queue_promoted_at?: string | null
          rank?: number | null
          registration_status?: string | null
          ties?: number | null
          tournament_id: string
          wins?: number | null
        }
        Update: {
          created_at?: string
          deck_reminder_sent_at?: string | null
          division?: string | null
          losses?: number | null
          payment_callback_token?: string | null
          payment_pending_since?: string | null
          player_id?: string
          points?: number | null
          queue_promoted_at?: string | null
          rank?: number | null
          registration_status?: string | null
          ties?: number | null
          tournament_id?: string
          wins?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_players_player_id_fkey"
            columns: ["player_id"]
            isOneToOne: false
            referencedRelation: "players"
            referencedColumns: ["tom_player_id"]
          },
          {
            foreignKeyName: "tournament_players_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: false
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournament_secrets: {
        Row: {
          created_at: string | null
          notification_webhook_secret: string | null
          notification_webhook_url: string | null
          payment_webhook_secret: string | null
          tournament_id: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          notification_webhook_secret?: string | null
          notification_webhook_url?: string | null
          payment_webhook_secret?: string | null
          tournament_id: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          notification_webhook_secret?: string | null
          notification_webhook_url?: string | null
          payment_webhook_secret?: string | null
          tournament_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tournament_secrets_tournament_id_fkey"
            columns: ["tournament_id"]
            isOneToOne: true
            referencedRelation: "tournaments"
            referencedColumns: ["id"]
          },
        ]
      }
      tournaments: {
        Row: {
          allow_online_match_reporting: boolean | null
          capacity_juniors: number | null
          capacity_masters: number | null
          capacity_seniors: number | null
          city: string | null
          country: string | null
          created_at: string
          date: string
          deck_list_submission_deadline: string | null
          deck_size: number | null
          deck_submission_cutoff_hours: number | null
          details: string | null
          enable_queue: boolean | null
          fee_juniors: string | null
          fee_masters: string | null
          fee_seniors: string | null
          id: string
          is_published: boolean | null
          juniors_birth_year_max: number | null
          name: string
          notification_webhook_secret: string | null
          notification_webhook_url: string | null
          organizer_popid: string | null
          parsed_data: Json | null
          payment_provider: string | null
          payment_required: boolean | null
          payment_url: string | null
          payment_webhook_secret: string | null
          pokemon_url: string | null
          publish_roster: boolean | null
          queue_batch_size: number | null
          queue_paused: boolean | null
          queue_promotion_window_minutes: number | null
          registration_closes_at: string | null
          registration_open: boolean | null
          registration_opens_at: string | null
          requires_deck_list: boolean | null
          seniors_birth_year_max: number | null
          sideboard_size: number | null
          start_time: string | null
          status: string
          tom_uid: string | null
          total_rounds: number
          tournament_mode: string
        }
        Insert: {
          allow_online_match_reporting?: boolean | null
          capacity_juniors?: number | null
          capacity_masters?: number | null
          capacity_seniors?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          date: string
          deck_list_submission_deadline?: string | null
          deck_size?: number | null
          deck_submission_cutoff_hours?: number | null
          details?: string | null
          enable_queue?: boolean | null
          fee_juniors?: string | null
          fee_masters?: string | null
          fee_seniors?: string | null
          id?: string
          is_published?: boolean | null
          juniors_birth_year_max?: number | null
          name: string
          notification_webhook_secret?: string | null
          notification_webhook_url?: string | null
          organizer_popid?: string | null
          parsed_data?: Json | null
          payment_provider?: string | null
          payment_required?: boolean | null
          payment_url?: string | null
          payment_webhook_secret?: string | null
          pokemon_url?: string | null
          publish_roster?: boolean | null
          queue_batch_size?: number | null
          queue_paused?: boolean | null
          queue_promotion_window_minutes?: number | null
          registration_closes_at?: string | null
          registration_open?: boolean | null
          registration_opens_at?: string | null
          requires_deck_list?: boolean | null
          seniors_birth_year_max?: number | null
          sideboard_size?: number | null
          start_time?: string | null
          status: string
          tom_uid?: string | null
          total_rounds: number
          tournament_mode?: string
        }
        Update: {
          allow_online_match_reporting?: boolean | null
          capacity_juniors?: number | null
          capacity_masters?: number | null
          capacity_seniors?: number | null
          city?: string | null
          country?: string | null
          created_at?: string
          date?: string
          deck_list_submission_deadline?: string | null
          deck_size?: number | null
          deck_submission_cutoff_hours?: number | null
          details?: string | null
          enable_queue?: boolean | null
          fee_juniors?: string | null
          fee_masters?: string | null
          fee_seniors?: string | null
          id?: string
          is_published?: boolean | null
          juniors_birth_year_max?: number | null
          name?: string
          notification_webhook_secret?: string | null
          notification_webhook_url?: string | null
          organizer_popid?: string | null
          parsed_data?: Json | null
          payment_provider?: string | null
          payment_required?: boolean | null
          payment_url?: string | null
          payment_webhook_secret?: string | null
          pokemon_url?: string | null
          publish_roster?: boolean | null
          queue_batch_size?: number | null
          queue_paused?: boolean | null
          queue_promotion_window_minutes?: number | null
          registration_closes_at?: string | null
          registration_open?: boolean | null
          registration_opens_at?: string | null
          requires_deck_list?: boolean | null
          seniors_birth_year_max?: number | null
          sideboard_size?: number | null
          start_time?: string | null
          status?: string
          tom_uid?: string | null
          total_rounds?: number
          tournament_mode?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      admin_reset_user_profile: {
        Args: {
          new_birth_year?: number
          new_pid?: string
          target_user_id: string
        }
        Returns: undefined
      }
      get_visible_tournaments: {
        Args: {
          requesting_user_id: string
          requesting_user_pid: string
          requesting_user_role: Database["public"]["Enums"]["app_role"]
        }
        Returns: {
          allow_online_match_reporting: boolean | null
          capacity_juniors: number | null
          capacity_masters: number | null
          capacity_seniors: number | null
          city: string | null
          country: string | null
          created_at: string
          date: string
          deck_list_submission_deadline: string | null
          deck_size: number | null
          deck_submission_cutoff_hours: number | null
          details: string | null
          enable_queue: boolean | null
          fee_juniors: string | null
          fee_masters: string | null
          fee_seniors: string | null
          id: string
          is_published: boolean | null
          juniors_birth_year_max: number | null
          name: string
          notification_webhook_secret: string | null
          notification_webhook_url: string | null
          organizer_popid: string | null
          parsed_data: Json | null
          payment_provider: string | null
          payment_required: boolean | null
          payment_url: string | null
          payment_webhook_secret: string | null
          pokemon_url: string | null
          publish_roster: boolean | null
          queue_batch_size: number | null
          queue_paused: boolean | null
          queue_promotion_window_minutes: number | null
          registration_closes_at: string | null
          registration_open: boolean | null
          registration_opens_at: string | null
          requires_deck_list: boolean | null
          seniors_birth_year_max: number | null
          sideboard_size: number | null
          start_time: string | null
          status: string
          tom_uid: string | null
          total_rounds: number
          tournament_mode: string
        }[]
        SetofOptions: {
          from: "*"
          to: "tournaments"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      process_tournament_queue: {
        Args: { p_tournament_id: string }
        Returns: {
          division: string
          new_status: string
          player_id: string
        }[]
      }
      register_player_atomic: {
        Args: {
          p_callback_token?: string
          p_division: string
          p_enable_queue?: boolean
          p_payment_required?: boolean
          p_player_id: string
          p_tournament_id: string
        }
        Returns: Json
      }
    }
    Enums: {
      app_role: "admin" | "organizer" | "user"
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
      app_role: ["admin", "organizer", "user"],
    },
  },
} as const
