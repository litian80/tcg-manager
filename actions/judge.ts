"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Helper to check if a user is authorized to act as a judge/organizer/admin for a specific tournament.
 */
async function checkTournamentAuth(supabase: SupabaseClient, userId: string, tournamentId: string): Promise<boolean> {
    console.log(`[checkTournamentAuth] Checking auth for user ${userId} on tournament ${tournamentId}`);
    // 1. Check if Judge
    const { data: judgeRecord, error: judgeError } = await supabase
        .from("tournament_judges")
        .select("tournament_id")
        .eq("tournament_id", tournamentId)
        .eq("user_id", userId)
        .single();
    
    console.log(`[checkTournamentAuth] Judge record:`, judgeRecord, `Error:`, judgeError);

    if (judgeRecord) return true;

    // 2. Check if Organizer / Admin
    const isOrgAdmin = await checkOrganizerAdminAuth(supabase, userId, tournamentId);
    console.log(`[checkTournamentAuth] Org/Admin check:`, isOrgAdmin);
    return isOrgAdmin;
}

/**
 * Strict helper to check if a user is authorized acting ONLY as an Organizer or Admin.
 */
async function checkOrganizerAdminAuth(supabase: SupabaseClient, userId: string, tournamentId: string): Promise<boolean> {
    const { data: profile } = await supabase
        .from("profiles")
        .select("role, pokemon_player_id")
        .eq("id", userId)
        .single();

    if (profile?.role === 'admin') return true;

    const { data: tournament } = await supabase
        .from("tournaments")
        .select("organizer_popid")
        .eq("id", tournamentId)
        .single();

    if (tournament) {
        if (tournament.organizer_popid && profile?.pokemon_player_id === tournament.organizer_popid) return true;
    }

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

export async function getPlayerJudgeDetails(tournamentId: string, playerTomId: string, playerDbId: string) {
    const supabase = await createClient();

    // Auth Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { penalties: [], deckChecks: [], error: "Unauthorized" };
    }

    const isAuthorized = await checkTournamentAuth(supabase, user.id, tournamentId);
    if (!isAuthorized) {
        return { penalties: [], deckChecks: [], error: "Unauthorized: You must be a Judge, Organizer, or Admin for this tournament." };
    }

    const adminClient = createAdminClient();

    // Fetch penalties, deck checks, and deck submission status in parallel
    const [penaltiesResult, checksResult, deckListResult] = await Promise.all([
        supabase
            .from('player_penalties')
            .select('*')
            .eq('tournament_id', tournamentId)
            .eq('player_id', playerTomId)
            .order('created_at', { ascending: false }),
        supabase
            .from('deck_checks')
            .select('*')
            .eq('tournament_id', tournamentId)
            .eq('player_id', playerTomId)
            .order('check_time', { ascending: false }),
        adminClient
            .from('deck_lists')
            .select('validation_status, raw_text, validation_errors')
            .eq('tournament_id', tournamentId)
            .eq('player_id', playerTomId)
            .maybeSingle()
    ]);

    const { data: rawPenalties, error: penaltiesError } = penaltiesResult;
    const { data: rawDeckChecks, error: checksError } = checksResult;

    if (penaltiesError) console.error("Error fetching penalties:", penaltiesError);
    if (checksError) console.error("Error fetching deck checks:", checksError);

    let penalties = rawPenalties || [];
    let deckChecks = rawDeckChecks || [];

    // Manually map judge profiles since foreign key might not be strictly defined in schema
    const judgeIds = new Set<string>();
    penalties.forEach(p => p.judge_user_id && judgeIds.add(p.judge_user_id));
    deckChecks.forEach(dc => dc.judge_user_id && judgeIds.add(dc.judge_user_id));

    if (judgeIds.size > 0) {
        const { data: profiles } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, nick_name')
            .in('id', Array.from(judgeIds));
            
        if (profiles) {
            const profileMap = new Map(profiles.map(p => [p.id, p]));
            penalties = penalties.map(p => ({ ...p, judge: profileMap.get(p.judge_user_id) || null }));
            deckChecks = deckChecks.map(dc => ({ ...dc, judge: profileMap.get(dc.judge_user_id) || null }));
        }
    }

    // Derive deck status
    let deckStatus: 'online' | 'paper' | 'missing' = 'missing';
    let paperMeta: any = null;
    if (deckListResult.data) {
        deckStatus = deckListResult.data.raw_text === '[PAPER DECKLIST]' ? 'paper' : 'online';
        if (deckStatus === 'paper' && deckListResult.data.validation_errors) {
            paperMeta = deckListResult.data.validation_errors;
        }
    }

    return {
        penalties: penalties || [],
        deckChecks: deckChecks || [],
        deckStatus,
        paperMeta
    };
}

export async function updatePenalty(formData: FormData) {
    const supabase = await createClient();
    const penaltyId = formData.get("penalty_id") as string;
    const tournamentId = formData.get("tournament_id") as string;
    const roundNumber = Number(formData.get("round_number"));
    const category = formData.get("category") as string;
    const severity = formData.get("severity") as string;
    const penalty = formData.get("penalty") as string;
    const notes = formData.get("notes") as string;

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    const isAuthorized = await checkOrganizerAdminAuth(supabase, user.id, tournamentId);

    if (!isAuthorized) {
        return { error: "Unauthorized: You must be an Organizer or Admin to edit a penalty." };
    }

    const { error } = await supabase
        .from("player_penalties")
        .update({
            round_number: roundNumber,
            category,
            severity,
            penalty,
            notes,
        })
        .eq("id", penaltyId)
        .eq("tournament_id", tournamentId); // Safety check

    if (error) {
        console.error("Error updating penalty:", error);
        return { error: error.message };
    }

    return { success: true };
}

export async function deletePenalty(penaltyId: string, tournamentId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    const isAuthorized = await checkOrganizerAdminAuth(supabase, user.id, tournamentId);

    if (!isAuthorized) {
        return { error: "Unauthorized: You must be an Organizer or Admin to delete a penalty." };
    }

    const { error } = await supabase
        .from("player_penalties")
        .delete()
        .eq("id", penaltyId)
        .eq("tournament_id", tournamentId);

    if (error) {
        console.error("Error deleting penalty:", error);
        return { error: error.message };
    }

    return { success: true };
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

export async function getPlayerDeckList(tournamentId: string, playerId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // Auth Check
    const isAuthorized = await checkTournamentAuth(supabase, user.id, tournamentId);
    if (!isAuthorized) {
        return { error: "Unauthorized: You must be a Judge, Organizer, or Admin for this tournament." };
    }

    const adminClient = createAdminClient();

    const { data: deckList, error } = await adminClient
        .from("deck_lists")
        .select(`
            id, raw_text, validation_status, submitted_at, validation_errors,
            deck_list_cards(
                card_id,
                quantity,
                cards(name, card_number, set_id, secondary_category, sets(code))
            )
        `)
        .eq("tournament_id", tournamentId)
        .eq("player_id", playerId)
        .maybeSingle();

    if (error) {
        console.error("Error fetching deck list:", error);
        return { error: "Failed to fetch deck list" };
    }

    return { deckList };
}
