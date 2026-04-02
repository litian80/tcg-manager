import { Database } from '@/utils/supabase/database.types';

export type Tournament = Database['public']['Tables']['tournaments']['Row'];

// All ExtendedTournament fields now exist on the base Tournament Row type.
// Kept as an alias for backwards compatibility with existing consumers.
export type ExtendedTournament = Tournament;

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
