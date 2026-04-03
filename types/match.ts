import { MatchPlayer } from './player';

export interface Match {
    id: string;
    round_number: number;
    table_number: number;
    player1_tom_id: string;
    player2_tom_id: string;
    p1?: MatchPlayer;
    p2?: MatchPlayer;
    winner_tom_id?: string | null;
    division?: string | null;
    is_finished: boolean;
    outcome?: number;
    p1_display_record?: string;
    p2_display_record?: string;
    time_extension_minutes?: number;
    player1_win?: string | null;
    tie?: string | null;
    player2_win?: string | null;
    p1_reported_result?: string | null;
    p2_reported_result?: string | null;
    tournament_id?: string;
}
