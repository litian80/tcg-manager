"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { createCoreOpsClient } from "@/utils/supabase/core-ops";
import { safeAction, ActionResult } from "@/lib/safe-action";
import { revalidatePath } from "next/cache";
import { invalidateTournament } from "@/lib/cache-invalidation";
import {
  generatePairings as computePairings,
  computeStandings,
  Outcome,
  generateSingleElimBracket
} from "@/lib/core-ops";
import type { PlayerInput, PairingRecord, StandingEntry, BracketMatchOutput } from "@/lib/core-ops";

// --- Helpers ---

async function requireOrganizer(tournamentId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: profile } = await supabase
    .from("profiles")
    .select("pokemon_player_id, role")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");

  const { data: tournament } = await supabase
    .from("tournaments")
    .select("organizer_popid, engine_type")
    .eq("id", tournamentId)
    .single();

  if (!tournament) throw new Error("Tournament not found");

  const isAdmin = profile.role === "admin";
  const isOrganizer = tournament.organizer_popid === profile.pokemon_player_id;

  if (!isAdmin && !isOrganizer) {
    throw new Error("Only the tournament organizer can perform this action");
  }

  return { tournament, profile };
}

function revalidateTournament(tournamentId: string) {
  revalidatePath(`/organizer/tournaments/${tournamentId}`);
  revalidatePath(`/tournament/${tournamentId}`);
  invalidateTournament(tournamentId);
}

// --- Generate Pairings ---

export async function generatePairings(
  tournamentId: string,
  roundNumber: number
): Promise<ActionResult> {
  return safeAction(async () => {
    const { tournament } = await requireOrganizer(tournamentId);

    if (tournament.engine_type !== "BUILT_IN") {
      return { error: "Pairings can only be generated for Built-in engine tournaments" };
    }

    const adminSupabase = await createAdminClient();
    const coreOps = await createCoreOpsClient();

    // Check no active round exists
    const { data: existingRound } = await coreOps
      .from("rounds")
      .select("id, status")
      .eq("tournament_id", tournamentId)
      .eq("round_number", roundNumber)
      .maybeSingle();

    if (existingRound) {
      return { error: `Round ${roundNumber} already exists (status: ${existingRound.status})` };
    }

    // Get active players with their records
    const { data: tournamentPlayers, error: playersError } = await adminSupabase
      .from("tournament_players")
      .select("player_id, wins, losses, ties, points, registration_status")
      .eq("tournament_id", tournamentId)
      .neq("registration_status", "dropped")
      .neq("registration_status", "cancelled");

    if (playersError || !tournamentPlayers || tournamentPlayers.length < 2) {
      return { error: "Failed to fetch players or insufficient players (need at least 2)" };
    }

    // Get pairing history from core_ops schema
    const { data: pairingHistory } = await coreOps
      .from("pairing_history")
      .select("player1_id, player2_id, round_number")
      .eq("tournament_id", tournamentId);

    // Build opponent map from pairing history
    const opponentMap: Record<string, string[]> = {};
    for (const ph of pairingHistory || []) {
      opponentMap[ph.player1_id] = opponentMap[ph.player1_id] || [];
      opponentMap[ph.player1_id].push(ph.player2_id);
      opponentMap[ph.player2_id] = opponentMap[ph.player2_id] || [];
      opponentMap[ph.player2_id].push(ph.player1_id);
    }

    // Check who already had a bye
    const { data: byeMatches } = await adminSupabase
      .from("matches")
      .select("player1_tom_id")
      .eq("tournament_id", tournamentId)
      .is("player2_tom_id", null);

    const byePlayers = new Set((byeMatches || []).map(m => m.player1_tom_id));

    // Build input for local pairing engine
    const playerInputs: PlayerInput[] = tournamentPlayers.map(tp => ({
      id: tp.player_id,
      matchPoints: tp.points || 0,
      isDropped: false,
      hasBye: byePlayers.has(tp.player_id),
      opponents: opponentMap[tp.player_id] || [],
    }));

    const prevPairings: PairingRecord[] = (pairingHistory || []).map(ph => ({
      p1: ph.player1_id,
      p2: ph.player2_id,
      round: ph.round_number,
    }));

    // Run pairing engine locally (no HTTP call!)
    const result = computePairings(playerInputs, prevPairings, { allowByes: true });

    // Create a map to look up display records (W-L-T) for the UI
    const recordMap = new Map(
      tournamentPlayers.map(tp => [
        tp.player_id,
        `${tp.wins || 0}-${tp.losses || 0}-${tp.ties || 0}`
      ])
    );

    // Get tournament division (for match upsert constraint)
    const { data: divisionData } = await adminSupabase
      .from("tournament_players")
      .select("division")
      .eq("tournament_id", tournamentId)
      .limit(1)
      .maybeSingle();
    const division = divisionData?.division || "master";

    // Write pairings to public.matches
    const matchInserts: Record<string, unknown>[] = result.pairings.map(p => ({
      tournament_id: tournamentId,
      round_number: roundNumber,
      table_number: p.tableNumber,
      player1_tom_id: p.p1,
      player2_tom_id: p.p2,
      is_finished: false,
      division,
      p1_display_record: recordMap.get(p.p1) || "0-0-0",
      p2_display_record: recordMap.get(p.p2) || "0-0-0",
    }));

    // Add bye match if applicable
    if (result.byePlayer) {
      matchInserts.push({
        tournament_id: tournamentId,
        round_number: roundNumber,
        table_number: matchInserts.length + 1,
        player1_tom_id: result.byePlayer,
        player2_tom_id: null,
        winner_tom_id: result.byePlayer,
        outcome: Outcome.BYE,
        is_finished: true,
        division,
        p1_display_record: recordMap.get(result.byePlayer) || "0-0-0",
      });
    }

    const { error: insertError } = await adminSupabase
      .from("matches")
      .upsert(matchInserts, { onConflict: "tournament_id,round_number,table_number,division" });

    if (insertError) {
      return { error: `Failed to save pairings: ${insertError.message}` };
    }

    // Record pairing history in core_ops
    const historyInserts = result.pairings.map(p => {
      const [lo, hi] = [p.p1, p.p2].sort();
      return {
        tournament_id: tournamentId,
        round_number: roundNumber,
        player1_id: lo,
        player2_id: hi,
      };
    });

    if (historyInserts.length > 0) {
      await coreOps
        .from("pairing_history")
        .upsert(historyInserts, { onConflict: "tournament_id,round_number,player1_id,player2_id" });
    }

    // Create round record in core_ops
    await coreOps
      .from("rounds")
      .insert({
        tournament_id: tournamentId,
        round_number: roundNumber,
        status: "PAIRING_GENERATED",
      });

    revalidateTournament(tournamentId);
    return { success: true };
  });
}

// --- Start Round ---

export async function startRound(
  tournamentId: string,
  roundNumber: number
): Promise<ActionResult> {
  return safeAction(async () => {
    await requireOrganizer(tournamentId);
    const coreOps = await createCoreOpsClient();

    const { data: round, error } = await coreOps
      .from("rounds")
      .update({ status: "ACTIVE" })
      .eq("tournament_id", tournamentId)
      .eq("round_number", roundNumber)
      .eq("status", "PAIRING_GENERATED")
      .select()
      .single();

    if (error || !round) {
      return { error: "Cannot start round — round may not be in PAIRING_GENERATED state" };
    }

    // Transition tournament status: not_started → running
    const adminSupabase = await createAdminClient();
    await adminSupabase
      .from("tournaments")
      .update({ status: "running" })
      .eq("id", tournamentId)
      .eq("status", "not_started");

    revalidateTournament(tournamentId);
    return { success: true };
  });
}

// --- End Round (Transition to FINALIZING) ---

export async function endRound(
  tournamentId: string,
  roundNumber: number
): Promise<ActionResult> {
  return safeAction(async () => {
    await requireOrganizer(tournamentId);
    const coreOps = await createCoreOpsClient();

    const { data: round, error } = await coreOps
      .from("rounds")
      .update({ status: "FINALIZING" })
      .eq("tournament_id", tournamentId)
      .eq("round_number", roundNumber)
      .eq("status", "ACTIVE")
      .select()
      .single();

    if (error || !round) {
      return { error: "Cannot end round — round may not be in ACTIVE state" };
    }

    revalidateTournament(tournamentId);
    return { success: true };
  });
}

// --- Get Round Finalization Summary ---

interface FinalizationMatch {
  id: string;
  player1_tom_id: string;
  player2_tom_id: string | null;
  p1_reported_result: string | null;
  p2_reported_result: string | null;
  is_finished: boolean;
  category: "auto" | "penalty" | "conflict" | "missing";
  has_penalty: boolean;
  p1_name?: string;
  p2_name?: string;
}

export async function getFinalizationSummary(
  tournamentId: string,
  roundNumber: number
): Promise<ActionResult<FinalizationMatch[]>> {
  return safeAction(async () => {
    await requireOrganizer(tournamentId);
    const adminSupabase = await createAdminClient();

    const { data: matches, error: matchesError } = await adminSupabase
      .from("matches")
      .select(`
        id, 
        player1_tom_id, 
        player2_tom_id, 
        p1_reported_result, 
        p2_reported_result, 
        is_finished,
        p1:players!player1_tom_id(first_name, last_name),
        p2:players!player2_tom_id(first_name, last_name)
      `)
      .eq("tournament_id", tournamentId)
      .eq("round_number", roundNumber)
      .not("player2_tom_id", "is", null);

    if (matchesError || !matches) {
      return { error: "Failed to fetch matches" };
    }

    const { data: penalties } = await adminSupabase
      .from("player_penalties")
      .select("player_id, penalty")
      .eq("tournament_id", tournamentId)
      .eq("round_number", roundNumber);

    const penaltyPlayerIds = new Set(
      (penalties || [])
        .filter(p => p.penalty === "Game Loss" || p.penalty === "Match Loss" || p.penalty === "Disqualification")
        .map(p => p.player_id)
    );

    const categorized: FinalizationMatch[] = matches
      .filter(m => !m.is_finished)
      .map(m => {
        const hasPenalty =
          penaltyPlayerIds.has(m.player1_tom_id) ||
          (m.player2_tom_id ? penaltyPlayerIds.has(m.player2_tom_id) : false);

        let category: FinalizationMatch["category"];

        if (!m.p1_reported_result && !m.p2_reported_result) {
          category = "missing";
        } else if (hasPenalty) {
          category = "penalty";
        } else if (
          m.p1_reported_result && m.p2_reported_result &&
          areReportsConsistent(m.p1_reported_result, m.p2_reported_result)
        ) {
          category = "auto";
        } else if (m.p1_reported_result && m.p2_reported_result) {
          category = "conflict";
        } else {
          category = "missing";
        }

        return {
          id: m.id,
          player1_tom_id: m.player1_tom_id,
          player2_tom_id: m.player2_tom_id,
          p1_name: (m.p1 as any)?.first_name ? `${(m.p1 as any).first_name} ${(m.p1 as any).last_name}` : m.player1_tom_id,
          p2_name: (m.p2 as any)?.first_name ? `${(m.p2 as any).first_name} ${(m.p2 as any).last_name}` : (m.player2_tom_id || ""),
          p1_reported_result: m.p1_reported_result,
          p2_reported_result: m.p2_reported_result,
          is_finished: m.is_finished,
          category,
          has_penalty: hasPenalty,
        };
      });

    return { success: categorized };
  });
}

function areReportsConsistent(p1Report: string, p2Report: string): boolean {
  if (p1Report === "win" && p2Report === "loss") return true;
  if (p1Report === "loss" && p2Report === "win") return true;
  if (p1Report === "tie" && p2Report === "tie") return true;
  return false;
}

// --- Finalize Round (Batch Write) ---

interface MatchResolution {
  matchId: string;
  outcome: number;
  winnerTomId: string | null;
}

export async function finalizeRound(
  tournamentId: string,
  roundNumber: number,
  resolutions: MatchResolution[]
): Promise<ActionResult> {
  return safeAction(async () => {
    await requireOrganizer(tournamentId);

    const adminSupabase = await createAdminClient();
    const coreOps = await createCoreOpsClient();

    // Verify round is in FINALIZING state
    const { data: round } = await coreOps
      .from("rounds")
      .select("status")
      .eq("tournament_id", tournamentId)
      .eq("round_number", roundNumber)
      .single();

    if (!round || round.status !== "FINALIZING") {
      return { error: "Round must be in FINALIZING state to finalize" };
    }

    // Apply all resolutions to public.matches
    for (const res of resolutions) {
      const { error } = await adminSupabase
        .from("matches")
        .update({
          is_finished: true,
          outcome: res.outcome,
          winner_tom_id: res.winnerTomId,
        })
        .eq("id", res.matchId);

      if (error) {
        return { error: `Failed to finalize match ${res.matchId}: ${error.message}` };
      }
    }

    // Update tournament_players standings
    await updateTournamentPlayerStandings(adminSupabase, tournamentId);

    // Generate standing snapshot (using local computation)
    await generateStandingSnapshot(coreOps, adminSupabase, tournamentId, roundNumber);

    // Mark round as FINISHED
    await coreOps
      .from("rounds")
      .update({ status: "FINISHED" })
      .eq("tournament_id", tournamentId)
      .eq("round_number", roundNumber);

    // ============================================
    // TOP CUT ADVANCEMENT LOGIC
    // ============================================
    const { data: bracket } = await coreOps
      .from("brackets")
      .select("id")
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (bracket) {
      // Determine which bracket round corresponds to this public round
      const { data: tournamentData } = await adminSupabase
        .from("tournaments")
        .select("total_rounds")
        .eq("id", tournamentId)
        .single();

      const totalRounds = tournamentData?.total_rounds || 0;
      // Only process bracket matches if this is actually a top cut round
      if (roundNumber > totalRounds) {
        const currentBracketRound = roundNumber - totalRounds;

        // Only fetch bracket matches for THIS specific bracket round
        const { data: bms } = await coreOps
          .from("bracket_matches")
          .select("*")
          .eq("bracket_id", bracket.id)
          .eq("bracket_round", currentBracketRound)
          .eq("is_finished", false);

        for (const res of resolutions) {
          // Find the public match to get players
          const { data: pubMatch } = await adminSupabase
            .from("matches")
            .select("player1_tom_id, player2_tom_id")
            .eq("id", res.matchId)
            .single();

          if (pubMatch && bms) {
            const p1 = pubMatch.player1_tom_id;
            const p2 = pubMatch.player2_tom_id;
            
            const bm = bms.find(m => 
              (m.player1_id === p1 && m.player2_id === p2) || 
              (m.player1_id === p2 && m.player2_id === p1)
            );

            if (bm) {
              await coreOps
                .from("bracket_matches")
                .update({
                  winner_id: res.winnerTomId,
                  is_finished: true,
                  outcome: res.outcome
                })
                .eq("id", bm.id);

              // Propagate winner to next round
              if (res.winnerTomId && bm.feeds_winner_to) {
                const { data: targetBm } = await coreOps
                  .from("bracket_matches")
                  .select("player1_id, player2_id")
                  .eq("id", bm.feeds_winner_to)
                  .single();
                
                if (targetBm) {
                  if (!targetBm.player1_id) {
                    await coreOps.from("bracket_matches").update({ player1_id: res.winnerTomId }).eq("id", bm.feeds_winner_to);
                  } else if (!targetBm.player2_id) {
                    await coreOps.from("bracket_matches").update({ player2_id: res.winnerTomId }).eq("id", bm.feeds_winner_to);
                  }
                }
              }
            }
          }
        }
      }
    }
    // ============================================

    // Check if the bracket is fully completed → mark tournament as completed
    if (bracket) {
      const { data: remaining } = await coreOps
        .from("bracket_matches")
        .select("id")
        .eq("bracket_id", bracket.id)
        .eq("is_finished", false)
        .limit(1);

      if (!remaining || remaining.length === 0) {
        // All bracket matches done — tournament is completed!
        await adminSupabase
          .from("tournaments")
          .update({ status: "completed" })
          .eq("id", tournamentId);
      }
    }

    revalidateTournament(tournamentId);
    return { success: true };
  });
}

// --- Update tournament_players with current standings ---

async function updateTournamentPlayerStandings(
  adminSupabase: Awaited<ReturnType<typeof createAdminClient>>,
  tournamentId: string
) {
  const { data: matches } = await adminSupabase
    .from("matches")
    .select("player1_tom_id, player2_tom_id, outcome, is_finished")
    .eq("tournament_id", tournamentId)
    .eq("is_finished", true);

  if (!matches) return;

  const stats: Record<string, { wins: number; losses: number; ties: number; points: number }> = {};

  for (const m of matches) {
    const p1 = m.player1_tom_id;
    const p2 = m.player2_tom_id;

    if (!stats[p1]) stats[p1] = { wins: 0, losses: 0, ties: 0, points: 0 };
    if (p2 && !stats[p2]) stats[p2] = { wins: 0, losses: 0, ties: 0, points: 0 };

    switch (m.outcome) {
      case Outcome.PLAYER1_WIN:
        stats[p1].wins++;
        stats[p1].points += 3;
        if (p2) stats[p2].losses++;
        break;
      case Outcome.PLAYER2_WIN:
        stats[p1].losses++;
        if (p2) { stats[p2].wins++; stats[p2].points += 3; }
        break;
      case Outcome.TIE:
        stats[p1].ties++;
        stats[p1].points += 1;
        if (p2) { stats[p2].ties++; stats[p2].points += 1; }
        break;
      case Outcome.BYE:
        stats[p1].wins++;
        stats[p1].points += 3;
        break;
    }
  }

  for (const [playerId, s] of Object.entries(stats)) {
    await adminSupabase
      .from("tournament_players")
      .update({ wins: s.wins, losses: s.losses, ties: s.ties, points: s.points })
      .eq("tournament_id", tournamentId)
      .eq("player_id", playerId);
  }
}

// --- Generate Standing Snapshot (local computation) ---

async function generateStandingSnapshot(
  coreOps: Awaited<ReturnType<typeof createCoreOpsClient>>,
  adminSupabase: Awaited<ReturnType<typeof createAdminClient>>,
  tournamentId: string,
  roundNumber: number
) {
  const { data: matches } = await adminSupabase
    .from("matches")
    .select("player1_tom_id, player2_tom_id, outcome, is_finished, round_number")
    .eq("tournament_id", tournamentId)
    .eq("is_finished", true);

  if (!matches) return;

  // Build player records for tiebreaker calculation
  const playerData: Record<string, {
    matchPoints: number;
    roundsPlayed: number;
    opponents: string[];
  }> = {};

  for (const m of matches) {
    const p1 = m.player1_tom_id;
    const p2 = m.player2_tom_id;

    if (!playerData[p1]) playerData[p1] = { matchPoints: 0, roundsPlayed: 0, opponents: [] };
    playerData[p1].roundsPlayed++;

    if (p2) {
      if (!playerData[p2]) playerData[p2] = { matchPoints: 0, roundsPlayed: 0, opponents: [] };
      playerData[p2].roundsPlayed++;
      playerData[p1].opponents.push(p2);
      playerData[p2].opponents.push(p1);
    }

    switch (m.outcome) {
      case Outcome.PLAYER1_WIN: playerData[p1].matchPoints += 3; break;
      case Outcome.PLAYER2_WIN: if (p2) playerData[p2].matchPoints += 3; break;
      case Outcome.TIE:
        playerData[p1].matchPoints += 1;
        if (p2) playerData[p2].matchPoints += 1;
        break;
      case Outcome.BYE: playerData[p1].matchPoints += 3; break;
    }
  }

  // Compute standings locally (no HTTP call!)
  const players = Object.entries(playerData).map(([id, data]) => ({
    id,
    matchPoints: data.matchPoints,
    roundsPlayed: data.roundsPlayed,
    opponents: data.opponents,
  }));

  const standings: StandingEntry[] = computeStandings(players);

  const snapshots = standings.map(s => ({
    tournament_id: tournamentId,
    round_number: roundNumber,
    player_id: s.playerId,
    rank: s.rank,
    match_points: s.matchPoints,
    mwp: s.mwp,
    omwp: s.omwp,
    oomwp: s.oomwp,
  }));

  // Delete old snapshots for this round (in case of re-finalization)
  await coreOps
    .from("standing_snapshots")
    .delete()
    .eq("tournament_id", tournamentId)
    .eq("round_number", roundNumber);

  if (snapshots.length > 0) {
    await coreOps
      .from("standing_snapshots")
      .insert(snapshots);
  }

  // Update ranks in tournament_players
  for (const s of standings) {
    await adminSupabase
      .from("tournament_players")
      .update({ rank: s.rank })
      .eq("tournament_id", tournamentId)
      .eq("player_id", s.playerId);
  }
}

// --- Drop Player ---

export async function dropPlayer(
  tournamentId: string,
  playerId: string // tom_player_id
): Promise<ActionResult> {
  return safeAction(async () => {
    const { tournament } = await requireOrganizer(tournamentId);

    if (tournament.engine_type !== "BUILT_IN") {
      return { error: "This action is only available for Built-in engine tournaments" };
    }

    const adminSupabase = await createAdminClient();
    const coreOps = await createCoreOpsClient();

    // Check if tournament is in top cut — drops not allowed during bracket play
    const { data: tournamentData } = await adminSupabase
      .from("tournaments")
      .select("total_rounds")
      .eq("id", tournamentId)
      .single();

    const totalRounds = tournamentData?.total_rounds || 0;

    // Find the latest round
    const { data: latestRound } = await coreOps
      .from("rounds")
      .select("round_number, status")
      .eq("tournament_id", tournamentId)
      .order("round_number", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestRound && totalRounds > 0 && latestRound.round_number > totalRounds) {
      return { error: "Cannot drop players during Top Cut. Resolve the bracket match manually instead." };
    }

    // Verify the player is currently active (not already dropped)
    const { data: tp } = await adminSupabase
      .from("tournament_players")
      .select("registration_status")
      .eq("tournament_id", tournamentId)
      .eq("player_id", playerId)
      .single();

    if (!tp) {
      return { error: "Player not found in this tournament." };
    }

    if (tp.registration_status === "dropped") {
      return { error: "Player is already dropped." };
    }

    // Set registration_status to 'dropped'
    const { error: dropError } = await adminSupabase
      .from("tournament_players")
      .update({ registration_status: "dropped" })
      .eq("tournament_id", tournamentId)
      .eq("player_id", playerId);

    if (dropError) {
      return { error: `Failed to drop player: ${dropError.message}` };
    }

    // Check if the player has an unfinished match in the current active/finalizing round
    if (latestRound && (latestRound.status === "ACTIVE" || latestRound.status === "FINALIZING" || latestRound.status === "PAIRING_GENERATED")) {
      const { data: activeMatch } = await adminSupabase
        .from("matches")
        .select("id, player1_tom_id, player2_tom_id")
        .eq("tournament_id", tournamentId)
        .eq("round_number", latestRound.round_number)
        .eq("is_finished", false)
        .or(`player1_tom_id.eq.${playerId},player2_tom_id.eq.${playerId}`)
        .maybeSingle();

      if (activeMatch && activeMatch.player2_tom_id) {
        // Auto-resolve: dropped player gets the loss, opponent gets the win
        const isPlayer1 = activeMatch.player1_tom_id === playerId;
        const winnerId = isPlayer1 ? activeMatch.player2_tom_id : activeMatch.player1_tom_id;
        const outcome = isPlayer1 ? Outcome.PLAYER2_WIN : Outcome.PLAYER1_WIN;

        await adminSupabase
          .from("matches")
          .update({
            is_finished: true,
            outcome,
            winner_tom_id: winnerId,
          })
          .eq("id", activeMatch.id);
      }
    }

    revalidateTournament(tournamentId);
    return { success: true };
  });
}

// --- Get Current Round Info ---

export async function getCurrentRound(
  tournamentId: string
): Promise<ActionResult<{ roundNumber: number; status: string } | null>> {
  return safeAction(async () => {
    const coreOps = await createCoreOpsClient();

    const { data: rounds } = await coreOps
      .from("rounds")
      .select("round_number, status")
      .eq("tournament_id", tournamentId)
      .order("round_number", { ascending: false })
      .limit(1);

    if (!rounds || rounds.length === 0) {
      return { success: null };
    }

    return {
      success: {
        roundNumber: rounds[0].round_number,
        status: rounds[0].status,
      },
    };
  });
}

// --- Top Cut Standings Preview ---

export interface TopCutStandingEntry {
  rank: number;
  playerId: string;
  playerName: string;
  matchPoints: number;
  record: string; // "W-L-T"
  omwp: number;   // Opponents' Match Win %
  oomwp: number;  // Opponents' Opponents' Match Win %
}

export async function getTopCutStandings(
  tournamentId: string,
  roundNumber: number
): Promise<ActionResult<TopCutStandingEntry[]>> {
  return safeAction(async () => {
    const coreOps = await createCoreOpsClient();
    const adminSupabase = await createAdminClient();

    // Get standings from the latest finalized round (including resistance)
    const { data: standings, error: standingsError } = await coreOps
      .from("standing_snapshots")
      .select("player_id, rank, match_points, omwp, oomwp")
      .eq("tournament_id", tournamentId)
      .eq("round_number", roundNumber)
      .order("rank", { ascending: true });

    if (standingsError || !standings || standings.length === 0) {
      return { error: "No standings available. Make sure the last round has been finalized." };
    }

    // Get player names — player_id in standings is tom_player_id, not UUID
    const playerIds = standings.map(s => s.player_id);
    const { data: players } = await adminSupabase
      .from("players")
      .select("tom_player_id, first_name, last_name")
      .in("tom_player_id", playerIds);

    const nameMap = new Map(
      (players || []).map(p => [p.tom_player_id, `${p.first_name} ${p.last_name}`])
    );

    // Get records
    const { data: tps } = await adminSupabase
      .from("tournament_players")
      .select("player_id, wins, losses, ties")
      .eq("tournament_id", tournamentId)
      .in("player_id", playerIds);

    const recordMap = new Map(
      (tps || []).map(tp => [tp.player_id, `${tp.wins || 0}-${tp.losses || 0}-${tp.ties || 0}`])
    );

    const result: TopCutStandingEntry[] = standings.map(s => ({
      rank: s.rank,
      playerId: s.player_id,
      playerName: nameMap.get(s.player_id) || s.player_id,
      matchPoints: s.match_points,
      record: recordMap.get(s.player_id) || "0-0-0",
      omwp: Number(s.omwp) || 0,
      oomwp: Number(s.oomwp) || 0,
    }));

    return { success: result };
  });
}

// --- Top Cut Generation ---

export async function generateTopCutPairings(
  tournamentId: string,
  currentRound: number, // the last Swiss round
  topCutSize: number
): Promise<ActionResult> {
  return safeAction(async () => {
    const { tournament } = await requireOrganizer(tournamentId);

    if (tournament.engine_type !== "BUILT_IN") {
      return { error: "Pairings can only be generated for Built-in engine tournaments" };
    }

    const adminSupabase = await createAdminClient();
    const coreOps = await createCoreOpsClient();

    // Check no active round exists
    const nextRound = currentRound + 1;
    const { data: existingRound } = await coreOps
      .from("rounds")
      .select("id, status")
      .eq("tournament_id", tournamentId)
      .eq("round_number", nextRound)
      .maybeSingle();

    if (existingRound) {
      return { error: `Round ${nextRound} already exists (status: ${existingRound.status})` };
    }

    // Get standings from current round
    const { data: standings, error: standingsError } = await coreOps
      .from("standing_snapshots")
      .select("player_id, rank")
      .eq("tournament_id", tournamentId)
      .eq("round_number", currentRound)
      .order("rank", { ascending: true })
      .limit(topCutSize);

    if (standingsError || !standings || standings.length < topCutSize) {
      return { error: "Insufficient players in standings to generate this top cut." };
    }

    const seeds = standings.map(s => s.player_id);
    const bracketMatches = generateSingleElimBracket(seeds, topCutSize);

    // Create the bracket
    const { data: bracket, error: bracketError } = await coreOps
      .from("brackets")
      .insert({
        tournament_id: tournamentId,
        type: "SINGLE_ELIM",
        top_cut_size: topCutSize
      })
      .select()
      .single();

    if (bracketError) return { error: `Failed to create bracket: ${bracketError.message}` };

    // Insert bracket matches (we need to track their generated IDs to hook up feeds_winner_to later)
    // We will do this in a multi-step process since `feeds_winner_to` requires the parent ID.
    // However, `bracket_matches` has a compound unique constraint (bracket_id, bracket_round, bracket_position)
    // We can just insert them, then fetch them, then update the feeds_winner_to.
    const { error: bmInsertError } = await coreOps
      .from("bracket_matches")
      .insert(bracketMatches.map(m => ({
        bracket_id: bracket.id,
        bracket_round: m.bracketRound,
        bracket_position: m.bracketPosition,
        player1_id: m.player1Id,
        player2_id: m.player2Id,
      })));

    if (bmInsertError) return { error: `Failed to insert bracket matches: ${bmInsertError.message}` };

    const { data: insertedBMs } = await coreOps
      .from("bracket_matches")
      .select("id, bracket_round, bracket_position")
      .eq("bracket_id", bracket.id);

    // Update feeds_winner_to
    for (const m of bracketMatches) {
      if (m.feedsWinnerToRound && m.feedsWinnerToPosition !== null) {
        const sourceMatch = insertedBMs?.find(i => i.bracket_round === m.bracketRound && i.bracket_position === m.bracketPosition);
        const targetMatch = insertedBMs?.find(i => i.bracket_round === m.feedsWinnerToRound && i.bracket_position === m.feedsWinnerToPosition);
        if (sourceMatch && targetMatch) {
          await coreOps
            .from("bracket_matches")
            .update({ feeds_winner_to: targetMatch.id })
            .eq("id", sourceMatch.id);
        }
      }
    }

    // Handle REAL byes in round 1: matches where the bracket was seeded with a null player
    // Only round 1 matches can have "true" byes from seeding.
    // Later rounds with one player are just waiting for feeder results.
    const { data: round1BMs } = await coreOps
      .from("bracket_matches")
      .select("*")
      .eq("bracket_id", bracket.id)
      .eq("bracket_round", 1)
      .eq("is_finished", false);

    for (const bm of round1BMs || []) {
      const hasP1 = !!bm.player1_id;
      const hasP2 = !!bm.player2_id;
      // A true bye: one player present, one null (seeded as null)
      if ((hasP1 && !hasP2) || (!hasP1 && hasP2)) {
        const winner = bm.player1_id || bm.player2_id;
        await coreOps
          .from("bracket_matches")
          .update({ winner_id: winner, is_finished: true, outcome: 3 })
          .eq("id", bm.id);

        // Propagate winner to next round
        if (bm.feeds_winner_to) {
          const { data: targetBm } = await coreOps
            .from("bracket_matches")
            .select("player1_id, player2_id")
            .eq("id", bm.feeds_winner_to)
            .single();

          if (targetBm) {
            if (!targetBm.player1_id) {
              await coreOps.from("bracket_matches").update({ player1_id: winner }).eq("id", bm.feeds_winner_to);
            } else if (!targetBm.player2_id) {
              await coreOps.from("bracket_matches").update({ player2_id: winner }).eq("id", bm.feeds_winner_to);
            }
          }
        }
      }
    }

    // Check if any later-round matches now have BOTH feeders finished but only one player
    // (meaning both feeders were byes that fed the same player, creating a cascading bye).
    // This is an edge case for very small brackets.
    let resolvedMore = true;
    while (resolvedMore) {
      resolvedMore = false;
      const { data: unfinished } = await coreOps
        .from("bracket_matches")
        .select("*")
        .eq("bracket_id", bracket.id)
        .eq("is_finished", false);

      for (const bm of unfinished || []) {
        // Find how many matches feed into this one
        const { data: feeders } = await coreOps
          .from("bracket_matches")
          .select("id, is_finished")
          .eq("bracket_id", bracket.id)
          .eq("feeds_winner_to", bm.id);

        const allFeedersFinished = feeders && feeders.length > 0 && feeders.every(f => f.is_finished);
        
        if (allFeedersFinished) {
          const hasP1 = !!bm.player1_id;
          const hasP2 = !!bm.player2_id;
          // Both feeders done but only one player arrived → cascading bye
          if ((hasP1 && !hasP2) || (!hasP1 && hasP2)) {
            const winner = bm.player1_id || bm.player2_id;
            await coreOps
              .from("bracket_matches")
              .update({ winner_id: winner, is_finished: true, outcome: 3 })
              .eq("id", bm.id);

            if (bm.feeds_winner_to) {
              const { data: targetBm } = await coreOps
                .from("bracket_matches")
                .select("player1_id, player2_id")
                .eq("id", bm.feeds_winner_to)
                .single();

              if (targetBm) {
                if (!targetBm.player1_id) {
                  await coreOps.from("bracket_matches").update({ player1_id: winner }).eq("id", bm.feeds_winner_to);
                } else if (!targetBm.player2_id) {
                  await coreOps.from("bracket_matches").update({ player2_id: winner }).eq("id", bm.feeds_winner_to);
                }
              }
            }
            resolvedMore = true;
          }
        }
      }
    }

    // Now, push Bracket Round 1 into public.matches!
    // Get display records
    const { data: tournamentPlayers } = await adminSupabase
      .from("tournament_players")
      .select("player_id, wins, losses, ties, division")
      .eq("tournament_id", tournamentId);

    const recordMap = new Map((tournamentPlayers || []).map(tp => [
      tp.player_id,
      `${tp.wins || 0}-${tp.losses || 0}-${tp.ties || 0}`
    ]));
    const division = tournamentPlayers?.[0]?.division || "master";

    const round1Matches = bracketMatches.filter(m => m.bracketRound === 1);
    
    // Some matches might have null players (Byes). 
    // Wait, MatchCard expects player1_tom_id. If player1 is null but player2 is present? We should swap them so player1 is always present if one is present.
    const publicMatchInserts: any[] = [];
    let tableNum = 1;
    for (const m of round1Matches) {
      let p1 = m.player1Id;
      let p2 = m.player2Id;
      if (!p1 && p2) {
        p1 = p2;
        p2 = null;
      }
      if (!p1 && !p2) continue; // Skip empty matches

      const isBye = !p2;

      publicMatchInserts.push({
        tournament_id: tournamentId,
        round_number: nextRound,
        table_number: tableNum++,
        player1_tom_id: p1,
        player2_tom_id: p2,
        winner_tom_id: isBye ? p1 : null,
        outcome: isBye ? Outcome.BYE : null,
        is_finished: isBye,
        division,
        p1_display_record: recordMap.get(p1!) || "0-0-0",
        p2_display_record: p2 ? (recordMap.get(p2) || "0-0-0") : null,
      });
    }

    if (publicMatchInserts.length > 0) {
      await adminSupabase.from("matches").insert(publicMatchInserts);
    }

    // Create round record
    await coreOps.from("rounds").insert({
      tournament_id: tournamentId,
      round_number: nextRound,
      status: "PAIRING_GENERATED",
    });

    revalidateTournament(tournamentId);
    return { success: true };
  });
}

export async function advanceTopCutRound(
  tournamentId: string,
  currentRound: number
): Promise<ActionResult> {
  return safeAction(async () => {
    const { tournament } = await requireOrganizer(tournamentId);

    const adminSupabase = await createAdminClient();
    const coreOps = await createCoreOpsClient();

    const nextRound = currentRound + 1;

    // Prevent duplicate round creation
    const { data: existingRound } = await coreOps
      .from("rounds")
      .select("id, status")
      .eq("tournament_id", tournamentId)
      .eq("round_number", nextRound)
      .maybeSingle();

    if (existingRound) {
      return { error: `Round ${nextRound} already exists (status: ${existingRound.status})` };
    }
    
    // Find active bracket
    const { data: bracket } = await coreOps
      .from("brackets")
      .select("id")
      .eq("tournament_id", tournamentId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!bracket) return { error: "No top cut bracket found." };

    // Find unfinished bracket matches that have BOTH players (ready to play)
    const { data: pendingMatches } = await coreOps
      .from("bracket_matches")
      .select("*")
      .eq("bracket_id", bracket.id)
      .eq("is_finished", false)
      .not("player1_id", "is", null)
      .not("player2_id", "is", null)
      .order("bracket_round", { ascending: true });

    if (!pendingMatches || pendingMatches.length === 0) {
      return { error: "Top Cut bracket is fully completed. No more matches to play." };
    }

    const nextBracketRound = pendingMatches[0].bracket_round;
    const bms = pendingMatches.filter(m => m.bracket_round === nextBracketRound);

    // Get display records
    const { data: tournamentPlayers } = await adminSupabase
      .from("tournament_players")
      .select("player_id, wins, losses, ties, division")
      .eq("tournament_id", tournamentId);

    const recordMap = new Map((tournamentPlayers || []).map(tp => [
      tp.player_id,
      `${tp.wins || 0}-${tp.losses || 0}-${tp.ties || 0}`
    ]));
    const division = tournamentPlayers?.[0]?.division || "master";

    const publicMatchInserts: any[] = [];
    let tableNum = 1;
    for (const m of bms) {
      publicMatchInserts.push({
        tournament_id: tournamentId,
        round_number: nextRound,
        table_number: tableNum++,
        player1_tom_id: m.player1_id,
        player2_tom_id: m.player2_id,
        is_finished: false,
        division,
        p1_display_record: recordMap.get(m.player1_id!) || "0-0-0",
        p2_display_record: recordMap.get(m.player2_id!) || "0-0-0",
      });
    }

    if (publicMatchInserts.length > 0) {
      await adminSupabase.from("matches").insert(publicMatchInserts);
    }

    // Create round record
    await coreOps.from("rounds").insert({
      tournament_id: tournamentId,
      round_number: nextRound,
      status: "PAIRING_GENERATED",
    });

    revalidateTournament(tournamentId);
    return { success: true };
  });
}

// --- Finish Tournament Without Top Cut ---

export async function finishTournamentWithoutTopCut(
  tournamentId: string
): Promise<ActionResult> {
  return safeAction(async () => {
    const { tournament } = await requireOrganizer(tournamentId);

    if (tournament.engine_type !== "BUILT_IN") {
      return { error: "This action is only available for Built-in engine tournaments" };
    }

    const adminSupabase = await createAdminClient();

    // Set tournament status to completed
    const { error } = await adminSupabase
      .from("tournaments")
      .update({ status: "completed" })
      .eq("id", tournamentId);

    if (error) {
      return { error: `Failed to finish tournament: ${error.message}` };
    }

    revalidateTournament(tournamentId);
    return { success: true };
  });
}

// --- Start Single Elimination (0 Swiss Rounds) ---

export async function startSingleElimination(
  tournamentId: string
): Promise<ActionResult> {
  return safeAction(async () => {
    const { tournament } = await requireOrganizer(tournamentId);

    if (tournament.engine_type !== "BUILT_IN") {
      return { error: "This action is only available for Built-in engine tournaments" };
    }

    const adminSupabase = await createAdminClient();
    const coreOps = await createCoreOpsClient();

    // Verify total_rounds === 0
    const { data: tournamentData } = await adminSupabase
      .from("tournaments")
      .select("total_rounds, status")
      .eq("id", tournamentId)
      .single();

    if (!tournamentData || tournamentData.total_rounds !== 0) {
      return { error: "Single elimination mode requires Swiss Rounds to be set to 0." };
    }

    // Check no rounds exist yet
    const { data: existingRound } = await coreOps
      .from("rounds")
      .select("id")
      .eq("tournament_id", tournamentId)
      .limit(1)
      .maybeSingle();

    if (existingRound) {
      return { error: "Tournament already has rounds. Cannot start single elimination." };
    }

    // Get active players
    const { data: tournamentPlayers, error: playersError } = await adminSupabase
      .from("tournament_players")
      .select("player_id, wins, losses, ties, division")
      .eq("tournament_id", tournamentId)
      .neq("registration_status", "dropped")
      .neq("registration_status", "cancelled");

    if (playersError || !tournamentPlayers || tournamentPlayers.length < 2) {
      return { error: "Need at least 2 active players to start single elimination." };
    }

    // Randomly shuffle players for seeding
    const shuffled = [...tournamentPlayers];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const seeds = shuffled.map(tp => tp.player_id);
    const bracketSize = Math.pow(2, Math.ceil(Math.log2(seeds.length)));

    // Generate bracket
    const bracketMatches = generateSingleElimBracket(seeds, seeds.length);

    // Create the bracket record
    const { data: bracket, error: bracketError } = await coreOps
      .from("brackets")
      .insert({
        tournament_id: tournamentId,
        type: "SINGLE_ELIM",
        top_cut_size: bracketSize,
      })
      .select()
      .single();

    if (bracketError) return { error: `Failed to create bracket: ${bracketError.message}` };

    // Insert bracket matches
    const { error: bmInsertError } = await coreOps
      .from("bracket_matches")
      .insert(bracketMatches.map(m => ({
        bracket_id: bracket.id,
        bracket_round: m.bracketRound,
        bracket_position: m.bracketPosition,
        player1_id: m.player1Id,
        player2_id: m.player2Id,
      })));

    if (bmInsertError) return { error: `Failed to insert bracket matches: ${bmInsertError.message}` };

    // Fetch inserted bracket matches and wire up feeds_winner_to
    const { data: insertedBMs } = await coreOps
      .from("bracket_matches")
      .select("id, bracket_round, bracket_position")
      .eq("bracket_id", bracket.id);

    for (const m of bracketMatches) {
      if (m.feedsWinnerToRound && m.feedsWinnerToPosition !== null) {
        const sourceMatch = insertedBMs?.find(i => i.bracket_round === m.bracketRound && i.bracket_position === m.bracketPosition);
        const targetMatch = insertedBMs?.find(i => i.bracket_round === m.feedsWinnerToRound && i.bracket_position === m.feedsWinnerToPosition);
        if (sourceMatch && targetMatch) {
          await coreOps
            .from("bracket_matches")
            .update({ feeds_winner_to: targetMatch.id })
            .eq("id", sourceMatch.id);
        }
      }
    }

    // Handle byes in round 1 (same logic as generateTopCutPairings)
    const { data: round1BMs } = await coreOps
      .from("bracket_matches")
      .select("*")
      .eq("bracket_id", bracket.id)
      .eq("bracket_round", 1)
      .eq("is_finished", false);

    for (const bm of round1BMs || []) {
      const hasP1 = !!bm.player1_id;
      const hasP2 = !!bm.player2_id;
      if ((hasP1 && !hasP2) || (!hasP1 && hasP2)) {
        const winner = bm.player1_id || bm.player2_id;
        await coreOps
          .from("bracket_matches")
          .update({ winner_id: winner, is_finished: true, outcome: 3 })
          .eq("id", bm.id);

        if (bm.feeds_winner_to) {
          const { data: targetBm } = await coreOps
            .from("bracket_matches")
            .select("player1_id, player2_id")
            .eq("id", bm.feeds_winner_to)
            .single();

          if (targetBm) {
            if (!targetBm.player1_id) {
              await coreOps.from("bracket_matches").update({ player1_id: winner }).eq("id", bm.feeds_winner_to);
            } else if (!targetBm.player2_id) {
              await coreOps.from("bracket_matches").update({ player2_id: winner }).eq("id", bm.feeds_winner_to);
            }
          }
        }
      }
    }

    // Resolve cascading byes
    let resolvedMore = true;
    while (resolvedMore) {
      resolvedMore = false;
      const { data: unfinished } = await coreOps
        .from("bracket_matches")
        .select("*")
        .eq("bracket_id", bracket.id)
        .eq("is_finished", false);

      for (const bm of unfinished || []) {
        const { data: feeders } = await coreOps
          .from("bracket_matches")
          .select("id, is_finished")
          .eq("bracket_id", bracket.id)
          .eq("feeds_winner_to", bm.id);

        const allFeedersFinished = feeders && feeders.length > 0 && feeders.every(f => f.is_finished);
        if (allFeedersFinished) {
          const hasP1 = !!bm.player1_id;
          const hasP2 = !!bm.player2_id;
          if ((hasP1 && !hasP2) || (!hasP1 && hasP2)) {
            const winner = bm.player1_id || bm.player2_id;
            await coreOps
              .from("bracket_matches")
              .update({ winner_id: winner, is_finished: true, outcome: 3 })
              .eq("id", bm.id);

            if (bm.feeds_winner_to) {
              const { data: targetBm } = await coreOps
                .from("bracket_matches")
                .select("player1_id, player2_id")
                .eq("id", bm.feeds_winner_to)
                .single();

              if (targetBm) {
                if (!targetBm.player1_id) {
                  await coreOps.from("bracket_matches").update({ player1_id: winner }).eq("id", bm.feeds_winner_to);
                } else if (!targetBm.player2_id) {
                  await coreOps.from("bracket_matches").update({ player2_id: winner }).eq("id", bm.feeds_winner_to);
                }
              }
            }
            resolvedMore = true;
          }
        }
      }
    }

    // Create public matches for bracket round 1
    const division = tournamentPlayers[0]?.division || "master";
    const recordMap = new Map(tournamentPlayers.map(tp => [
      tp.player_id,
      `${tp.wins || 0}-${tp.losses || 0}-${tp.ties || 0}`
    ]));

    const round1Matches = bracketMatches.filter(m => m.bracketRound === 1);
    const publicMatchInserts: any[] = [];
    let tableNum = 1;
    for (const m of round1Matches) {
      let p1 = m.player1Id;
      let p2 = m.player2Id;
      if (!p1 && p2) { p1 = p2; p2 = null; }
      if (!p1 && !p2) continue;

      const isBye = !p2;
      publicMatchInserts.push({
        tournament_id: tournamentId,
        round_number: 1,
        table_number: tableNum++,
        player1_tom_id: p1,
        player2_tom_id: p2,
        winner_tom_id: isBye ? p1 : null,
        outcome: isBye ? Outcome.BYE : null,
        is_finished: isBye,
        division,
        p1_display_record: recordMap.get(p1!) || "0-0-0",
        p2_display_record: p2 ? (recordMap.get(p2) || "0-0-0") : null,
      });
    }

    if (publicMatchInserts.length > 0) {
      await adminSupabase.from("matches").insert(publicMatchInserts);
    }

    // Create round record
    await coreOps.from("rounds").insert({
      tournament_id: tournamentId,
      round_number: 1,
      status: "PAIRING_GENERATED",
    });

    // Transition tournament to running
    await adminSupabase
      .from("tournaments")
      .update({ status: "running" })
      .eq("id", tournamentId)
      .eq("status", "not_started");

    revalidateTournament(tournamentId);
    return { success: true };
  });
}
