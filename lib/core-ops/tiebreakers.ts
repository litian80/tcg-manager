/**
 * Core Ops — Tiebreaker calculations per Pokémon TCG Tournament Rules.
 *
 * Hierarchy:
 *   1. Match Points (descending)
 *   2. Opponent's Win Percentage (OMWP)
 *   3. Opponent's Opponent's Win Percentage (OOMWP)
 *
 * Key rules:
 *   - Win% = match_points / (rounds_played × 3), floored at 25%
 *   - Bye opponents are excluded from OMWP/OOMWP
 *   - Each opponent's Win% is individually floored at 25%
 */

import { MWP_FLOOR } from "./constants";

// --- Types ---

export interface PlayerRecord {
  id: string;
  matchPoints: number;
  roundsPlayed: number;
  /** Opponent IDs faced (excluding bye) */
  opponents: string[];
}

export interface StandingEntry {
  playerId: string;
  rank: number;
  matchPoints: number;
  mwp: number;
  omwp: number;
  oomwp: number;
}

// --- Functions ---

/**
 * Compute Match Win Percentage.
 * MWP = match_points / (rounds_played × 3), floored at 25%.
 */
export function computeMwp(player: PlayerRecord): number {
  if (player.roundsPlayed <= 0) return MWP_FLOOR;
  const raw = player.matchPoints / (player.roundsPlayed * 3);
  return Math.max(MWP_FLOOR, raw);
}

/**
 * Compute Opponent's Match Win Percentage.
 * Average of MWP of all real opponents (byes excluded).
 * Each opponent's MWP is individually floored at 25%.
 */
export function computeOmwp(
  player: PlayerRecord,
  allPlayers: Map<string, PlayerRecord>
): number {
  const realOpponents = player.opponents.filter((id) => allPlayers.has(id));
  if (realOpponents.length === 0) return MWP_FLOOR;

  const total = realOpponents.reduce(
    (sum, oppId) => sum + computeMwp(allPlayers.get(oppId)!),
    0
  );
  return total / realOpponents.length;
}

/**
 * Compute Opponent's Opponent's Match Win Percentage.
 * Average of OMWP of all real opponents.
 */
export function computeOomwp(
  player: PlayerRecord,
  allPlayers: Map<string, PlayerRecord>
): number {
  const realOpponents = player.opponents.filter((id) => allPlayers.has(id));
  if (realOpponents.length === 0) return MWP_FLOOR;

  const total = realOpponents.reduce(
    (sum, oppId) => sum + computeOmwp(allPlayers.get(oppId)!, allPlayers),
    0
  );
  return total / realOpponents.length;
}

/**
 * Compute full standings with tiebreakers for all players.
 *
 * Returns sorted by:
 *   1. matchPoints DESC
 *   2. OMWP DESC
 *   3. OOMWP DESC
 */
export function computeStandings(players: PlayerRecord[]): StandingEntry[] {
  const playerMap = new Map(players.map((p) => [p.id, p]));

  const entries: StandingEntry[] = players.map((p) => {
    const mwp = computeMwp(p);
    const omwp = computeOmwp(p, playerMap);
    const oomwp = computeOomwp(p, playerMap);
    return {
      playerId: p.id,
      rank: 0,
      matchPoints: p.matchPoints,
      mwp: Math.round(mwp * 10000) / 10000,
      omwp: Math.round(omwp * 10000) / 10000,
      oomwp: Math.round(oomwp * 10000) / 10000,
    };
  });

  // Sort: matchPoints DESC, omwp DESC, oomwp DESC
  entries.sort((a, b) => {
    if (b.matchPoints !== a.matchPoints) return b.matchPoints - a.matchPoints;
    if (b.omwp !== a.omwp) return b.omwp - a.omwp;
    return b.oomwp - a.oomwp;
  });

  // Assign ranks (1-indexed, ties get same rank)
  for (let i = 0; i < entries.length; i++) {
    if (i === 0) {
      entries[i].rank = 1;
    } else {
      const prev = entries[i - 1];
      const curr = entries[i];
      if (
        curr.matchPoints === prev.matchPoints &&
        curr.omwp === prev.omwp &&
        curr.oomwp === prev.oomwp
      ) {
        curr.rank = prev.rank; // tied
      } else {
        curr.rank = i + 1;
      }
    }
  }

  return entries;
}
