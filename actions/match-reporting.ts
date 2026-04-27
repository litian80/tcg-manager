"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { safeAction, ActionResult } from "@/lib/safe-action";
import { MatchReportValue } from "@/utils/match-reporting";
import { revalidatePath } from "next/cache";

export async function reportMatchResult(
  matchId: string,
  result: MatchReportValue | null
): Promise<ActionResult> {
  return safeAction(async () => {
    const supabase = await createClient();
    
    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    // Get strictly the pokemon_player_id
    const { data: profile } = await supabase
      .from("profiles")
      .select("pokemon_player_id")
      .eq("id", user.id)
      .single();

    if (!profile?.pokemon_player_id) {
       return { error: "Profile missing POP ID." };
    }

    const popId = profile.pokemon_player_id;

    // Fetch the match and tournament setting
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select(`
        id, 
        player1_tom_id, 
        player2_tom_id, 
        is_finished, 
        tournament_id,
        tournaments ( allow_online_match_reporting )
      `)
      .eq("id", matchId)
      .single();

    if (matchError || !match) {
        return { error: "Match not found." };
    }

    const tournament = Array.isArray(match.tournaments) 
      ? match.tournaments[0] 
      : match.tournaments;

    if (!tournament?.allow_online_match_reporting) {
        return { error: "Online match reporting is not enabled for this tournament." };
    }

    if (match.is_finished) {
        return { error: "Match is already finalized by the organizer." };
    }

    // Determine if user is p1 or p2
    const isPlayer1 = match.player1_tom_id === popId;
    const isPlayer2 = match.player2_tom_id === popId;

    if (!isPlayer1 && !isPlayer2) {
        return { error: "You are not a participant in this match." };
    }

    const updateColumn = isPlayer1 ? "p1_reported_result" : "p2_reported_result";

    // SEC-007: Use admin client for update — user is already validated as a match participant above
    const adminSupabase = await createAdminClient();
    const { error: updateError } = await adminSupabase
      .from("matches")
      .update({ [updateColumn]: result })
      .eq("id", matchId);

    if (updateError) {
        return { error: "Failed to submit result." };
    }

    // Revalidate BOTH the player and organizer views
    revalidatePath(`/tournament/${match.tournament_id}`); 
    revalidatePath(`/organizer/tournaments/${match.tournament_id}`);
    revalidatePath(`/tournament/${match.tournament_id}`, 'layout');
    revalidatePath(`/organizer/tournaments/${match.tournament_id}`, 'layout');
    
    return { success: true };
  });
}
