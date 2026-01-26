"use server";

import { createClient } from "@/utils/supabase/server";

export interface MiniGame {
    match_id: string;
    board: string[][]; // 6 rows x 7 cols
    turn: string; // 'p1' or 'p2' (using tom_id or generic 'p1'/'p2' might be safer? sticking to player_tom_id as per plan, or 'p1'/'p2' relative to match?)
    // Plan said: turn (Text, PlayerID).
    winner: string | null;
}

export async function createOrJoinGame(matchId: string, playerId: string) {
    const supabase = await createClient();

    // 1. Check if game exists
    const { data: existingGame } = await supabase
        .from('mini_games')
        .select('*')
        .eq('match_id', matchId)
        .single();

    if (existingGame) {
        return { game: existingGame, error: null };
    }

    // 2. Fetch Match to determine Winner/Loser
    const { data: match, error: matchError } = await supabase
        .from('matches')
        .select('player1_tom_id, player2_tom_id, winner_tom_id')
        .eq('id', matchId)
        .single();

    if (matchError || !match) {
        console.error("Error fetching match for mini-game:", matchError);
        return { game: null, error: "Match not found" };
    }

    // Determine Loser (Start Player)
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

    const { error } = await supabase
        .from('mini_games')
        .update({ board, turn, winner })
        .eq('match_id', matchId);

    if (error) {
        console.error("Error updating game state:", error);
        throw new Error("Failed to update game state");
    }

    return { success: true };
}
