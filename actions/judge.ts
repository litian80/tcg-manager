"use server";

import { createClient } from "@/utils/supabase/server";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Helper to check if a user is authorized to act as a judge/organizer/admin for a specific tournament.
 */
async function checkTournamentAuth(supabase: SupabaseClient, userId: string, tournamentId: string): Promise<boolean> {
    // 1. Check if Judge
    const { data: judgeRecord } = await supabase
        .from("tournament_judges")
        .select("id")
        .eq("tournament_id", tournamentId)
        .eq("user_id", userId)
        .single();

    if (judgeRecord) return true;

    // 2. Check if Organizer
    const { data: tournament } = await supabase
        .from("tournaments")
        .select("organizer_id")
        .eq("id", tournamentId)
        .single();

    if (tournament && tournament.organizer_id === userId) return true;

    // 3. Check if Admin
    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", userId)
        .single();

    if (profile?.role === 'admin') return true;

    return false;
}

export async function addPenalty(formData: FormData) {
    const supabase = await createClient();
    const tournamentId = formData.get("tournament_id") as string;
    const playerId = formData.get("player_id") as string;
    const roundNumber = Number(formData.get("round_number"));
    const category = formData.get("category") as string;
    const severity = formData.get("severity") as string;
    const penalty = formData.get("penalty") as string;
    const notes = formData.get("notes") as string;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    const isAuthorized = await checkTournamentAuth(supabase, user.id, tournamentId);

    if (!isAuthorized) {
        return { error: "Unauthorized: You must be a Judge, Organizer, or Admin for this tournament." };
    }

    const { error } = await supabase.from("player_penalties").insert({
        tournament_id: tournamentId,
        player_id: playerId,
        judge_user_id: user.id,
        round_number: roundNumber,
        category,
        severity,
        penalty,
        notes,
    });

    if (error) {
        console.error("Error adding penalty:", error);
        return { error: error.message };
    }

    return { success: true };
}

export async function addDeckCheck(formData: FormData) {
    const supabase = await createClient();
    const tournamentId = formData.get("tournament_id") as string;
    const playerId = formData.get("player_id") as string;
    const roundNumber = Number(formData.get("round_number"));
    const note = formData.get("note") as string;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // Apply strict auth check here too for consistency
    const isAuthorized = await checkTournamentAuth(supabase, user.id, tournamentId);

    if (!isAuthorized) {
        return { error: "Unauthorized: You must be a Judge, Organizer, or Admin for this tournament." };
    }

    const { error } = await supabase.from("deck_checks").insert({
        tournament_id: tournamentId,
        player_id: playerId,
        judge_user_id: user.id,
        round_number: roundNumber,
        note: note ? note : null
    });

    if (error) {
        console.error("Error adding deck check:", error);
        return { error: error.message };
    }

    return { success: true };
}

export async function getPlayerJudgeDetails(tournamentId: string, playerId: string) {
    const supabase = await createClient();

    // Fetch penalties
    const { data: penalties, error: penaltiesError } = await supabase
        .from('player_penalties')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('player_id', playerId)
        .order('created_at', { ascending: false });

    // Fetch deck checks
    const { data: deckChecks, error: checksError } = await supabase
        .from('deck_checks')
        .select('*')
        .eq('tournament_id', tournamentId)
        .eq('player_id', playerId)
        .order('check_time', { ascending: false });

    if (penaltiesError) console.error("Error fetching penalties:", penaltiesError);
    if (checksError) console.error("Error fetching deck checks:", checksError);

    return {
        penalties: penalties || [],
        deckChecks: deckChecks || []
    };
}

export async function updateMatchTimeExtension(matchId: string, minutes: number) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { error: "Unauthorized" };

    // 1. Fetch match to get tournament_id
    const { data: match } = await supabase
        .from('matches')
        .select('tournament_id')
        .eq('id', matchId)
        .single();

    if (!match) return { error: "Match not found" };

    // 2. Check Auth
    const isAuthorized = await checkTournamentAuth(supabase, user.id, match.tournament_id);

    if (!isAuthorized) {
        return { error: "Unauthorized" };
    }

    const { error } = await supabase
        .from('matches')
        .update({ time_extension_minutes: minutes })
        .eq('id', matchId);

    if (error) {
        console.error("Error updating match extension:", error);
        return { error: "Failed to update extension" };
    }

    return { success: true };
}
