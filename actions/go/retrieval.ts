"use server";

import { createClient } from "@/utils/supabase/server";
import type { GOPokemon } from "@/lib/go/types";

export interface GOTeamListRow {
    id: string;
    tournament_id: string;
    player_id: string;
    player_name: string;
    in_game_nickname: string;
    parsed_team: GOPokemon[];
    validation_status: string | null;
    validation_errors: any;
    submitted_at: string | null;
}

/**
 * Get the current player's GO team list for a tournament.
 */
export async function getPlayerGOTeamList(tournamentId: string): Promise<GOTeamListRow | null> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('pokemon_player_id')
        .eq('id', user.id)
        .single();

    if (!profile?.pokemon_player_id) return null;

    const { data, error } = await supabase
        .from('go_team_lists' as any)
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('player_id', profile.pokemon_player_id)
        .single();

    if (error || !data) return null;

    return {
        ...(data as any),
        parsed_team: (data as any).parsed_team as unknown as GOPokemon[],
    };
}

/**
 * Get all GO team lists for a tournament (organiser/admin view).
 * Uses service role via server client since RLS restricts player access.
 */
export async function getAllGOTeamLists(tournamentId: string): Promise<GOTeamListRow[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('go_team_lists' as any)
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('submitted_at', { ascending: true });

    if (error || !data) return [];

    return (data as any[]).map(row => ({
        ...row,
        parsed_team: row.parsed_team as unknown as GOPokemon[],
    }));
}

/**
 * Get the count of submitted GO team lists for a tournament.
 */
export async function getGOTeamListCount(tournamentId: string): Promise<number> {
    const supabase = await createClient();

    const { count, error } = await supabase
        .from('go_team_lists' as any)
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId);

    if (error) return 0;
    return count ?? 0;
}
