"use server";

import { createClient } from "@/utils/supabase/server";

export interface MiniGame {
    match_id: string;
    board: string[][]; // 6 rows x 7 cols
    turn: string; // player_tom_id of whose turn it is
    winner: string | null;
}

/**
 * Helper: verify caller is logged in and is a participant in the match.
 * Returns the user's POP ID if authorized, or an error.
 */
async function verifyMatchParticipant(supabase: any, matchId: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: "Unauthorized: You must be logged in." };
    }

    // Get caller's POP ID from profile
    const { data: profile } = await supabase
        .from('profiles')
        .select('pokemon_player_id')
        .eq('id', user.id)
        .single();

    if (!profile?.pokemon_player_id) {
        return { error: "Profile missing Player ID." };
    }

    // Fetch match to verify participation
    const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('player1_tom_id, player2_tom_id, winner_tom_id')
        .eq('id', matchId)
        .single();

    if (matchError || !match) {
        return { error: "Match not found" };
    }

    const popId = profile.pokemon_player_id;
    if (popId !== match.player1_tom_id && popId !== match.player2_tom_id) {
        return { error: "Unauthorized: You are not a participant in this match." };
    }

    return { user, popId, match };
}

export async function createOrJoinGame(matchId: string, playerId: string) {
    const supabase = await createClient();

    // Auth: must be logged in and a participant in this match
    const authResult = await verifyMatchParticipant(supabase, matchId);
    if ('error' in authResult && !('match' in authResult)) {
        return { game: null, error: authResult.error };
    }

    const { match } = authResult as { user: any; popId: string; match: any };

    // 1. Check if game already exists
    const { data: existingGame } = await supabase
        .from('mini_games')
        .select('*')
        .eq('match_id', matchId)
        .single();

    if (existingGame) {
        return { game: existingGame, error: null };
    }

    // 2. Determine Loser (Start Player)
    let startPlayerId = playerId; // Fallback
    if (match.winner_tom_id) {
        if (match.winner_tom_id === match.player1_tom_id) {
            startPlayerId = match.player2_tom_id;
        } else if (match.winner_tom_id === match.player2_tom_id) {
            startPlayerId = match.player1_tom_id;
        }
    }

    // Initialize 6x7 empty board
    const emptyBoard = Array(6).fill(null).map(() => Array(7).fill(null));

    const newGame = {
        match_id: matchId,
        board: emptyBoard,
        turn: startPlayerId,
        winner: null,
    };

    const { data: createdGame, error: createError } = await supabase
        .from('mini_games')
        .insert(newGame)
        .select()
        .single();

    if (createError) {
        console.error("Error creating mini-game:", createError);
        return { game: null, error: createError.message };
    }

    return { game: createdGame, error: null };
}

export async function updateGameState(matchId: string, board: any, turn: string, winner: string | null) {
    const supabase = await createClient();

    // Auth: must be logged in and a participant in this match
    const authResult = await verifyMatchParticipant(supabase, matchId);
    if ('error' in authResult && !('match' in authResult)) {
        return { error: authResult.error };
    }

    const { error } = await supabase
        .from('mini_games')
        .update({ board, turn, winner })
        .eq('match_id', matchId);

    if (error) {
        console.error("Error updating game state:", error);
        return { error: "Failed to update game state" };
    }

    return { success: true };
}
