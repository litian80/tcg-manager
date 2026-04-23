"use server";

import { createClient } from "@/utils/supabase/server";
import type { VGCPokemon } from "@/lib/vgc/types";

export interface VGCTeamListRow {
    id: string;
    tournament_id: string;
    player_id: string;
    raw_paste: string;
    parsed_team: VGCPokemon[];
    validation_status: string | null;
    validation_errors: any;
    submitted_at: string | null;
}

/**
 * FEAT-010: Get the current player's VGC team list for a tournament.
 */
export async function getPlayerTeamList(tournamentId: string): Promise<VGCTeamListRow | null> {
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
        .from('vgc_team_lists')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('player_id', profile.pokemon_player_id)
        .single();

    if (error || !data) return null;

    return {
        ...data,
        parsed_team: data.parsed_team as unknown as VGCPokemon[],
    };
}

/**
 * FEAT-010: Get all VGC team lists for a tournament (organiser/admin view).
 */
export async function getAllTeamLists(tournamentId: string): Promise<VGCTeamListRow[]> {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('vgc_team_lists')
        .select('*')
        .eq('tournament_id', tournamentId)
        .order('submitted_at', { ascending: true });

    if (error || !data) return [];

    return data.map(row => ({
        ...row,
        parsed_team: row.parsed_team as unknown as VGCPokemon[],
    }));
}

/**
 * FEAT-010: Get the count of submitted team lists for a tournament.
 */
export async function getTeamListCount(tournamentId: string): Promise<number> {
    const supabase = await createClient();

    const { count, error } = await supabase
        .from('vgc_team_lists')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId);

    if (error) return 0;
    return count ?? 0;
}
