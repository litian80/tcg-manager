import { Database } from '@/utils/supabase/database.types';

export type Tournament = Database['public']['Tables']['tournaments']['Row'];

export interface ExtendedTournament extends Tournament {
    tournament_mode?: string | null;
    requires_deck_list?: boolean | null;
    deck_submission_cutoff_hours?: number | null;
    deck_list_submission_deadline?: string | null;
    start_time?: string | null;
};

export type Division = "junior" | "senior" | "master";

export type TournamentStatusConfig = {
  label: string
  variant: 'default' | 'secondary' | 'destructive' | 'outline'
  className: string
}

export interface Standing {
    player_id: string;
    rank: number;
    division: string | null;
    wins: number;
    losses: number;
    ties: number;
    points: number;
    player: {
        first_name: string;
        last_name: string;
        tom_player_id: string | null;
    } | null;
}
