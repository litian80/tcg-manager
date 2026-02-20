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
      matches: {
        Row: {
          division: string | null
          id: string
          is_finished: boolean
          outcome: number | null
          p1_display_record: string | null
          p2_display_record: string | null
          player1_tom_id: string
          player2_tom_id: string | null
          round_number: number
          table_number: number
          tournament_id: string
          winner_tom_id: string | null
        }
        Insert: {
          division?: string | null
          id?: string
          is_finished?: boolean
          outcome?: number | null
          p1_display_record?: string | null
          p2_display_record?: string | null
          player1_tom_id: string
          player2_tom_id?: string | null
          round_number: number
          table_number: number
          tournament_id: string
          winner_tom_id?: string | null
        }
        Update: {
          division?: string | null
          id?: string
          is_finished?: boolean
          outcome?: number | null
          p1_display_record?: string | null
          p2_display_record?: string | null
          player1_tom_id?: string
          player2_tom_id?: string | null
          round_number?: number
          table_number?: number
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
          division: string | null
          losses: number | null
          player_id: string
          points: number | null
          rank: number | null
          ties: number | null
          tournament_id: string
          wins: number | null
        }
        Insert: {
          division?: string | null
          losses?: number | null
          player_id: string
          points?: number | null
          rank?: number | null
          ties?: number | null
          tournament_id: string
          wins?: number | null
        }
        Update: {
          division?: string | null
          losses?: number | null
          player_id?: string
          points?: number | null
          rank?: number | null
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
      tournaments: {
        Row: {
          city: string | null
          country: string | null
          created_at: string
          date: string
          id: string
          is_published: boolean | null
          name: string
          organizer_popid: string | null
          parsed_data: Json | null
          status: string
          tom_uid: string | null
          total_rounds: number
        }
        Insert: {
          city?: string | null
          country?: string | null
          created_at?: string
          date: string
          id?: string
          is_published?: boolean | null
          name: string
          organizer_popid?: string | null
          parsed_data?: Json | null
          status: string
          tom_uid?: string | null
          total_rounds: number
        }
        Update: {
          city?: string | null
          country?: string | null
          created_at?: string
          date?: string
          id?: string
          is_published?: boolean | null
          name?: string
          organizer_popid?: string | null
          parsed_data?: Json | null
          status?: string
          tom_uid?: string | null
          total_rounds?: number
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
          city: string | null
          country: string | null
          created_at: string
          date: string
          id: string
          is_published: boolean | null
          name: string
          organizer_popid: string | null
          parsed_data: Json | null
          status: string
          tom_uid: string | null
          total_rounds: number
        }[]
        SetofOptions: {
          from: "*"
          to: "tournaments"
          isOneToOne: false
          isSetofReturn: true
        }
      }
    }
    Enums: {
      app_role: "admin" | "organizer" | "judge" | "user"
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
      app_role: ["admin", "organizer", "judge", "user"],
    },
  },
} as const
