/**
 * Core Ops — Single-elimination bracket generator.
 *
 * Generates a balanced bracket tree for top-cut play.
 * Supports standard sizes: 4, 8, 16, 32 players.
 *
 * Seeding follows standard tournament bracket seeding:
 *   - Seed 1 is placed to potentially meet Seed 2 in the final
 *   - Seed 1 and Seed 4 are on the same side, Seed 2 and Seed 3 on the other
 */

// --- Types ---

export interface BracketMatchOutput {
  bracketRound: number;
  bracketPosition: number;
  player1Id: string | null;
  player2Id: string | null;
  feedsWinnerToRound: number | null;
  feedsWinnerToPosition: number | null;
}

// --- Internal ---

/**
 * Generate standard tournament bracket seeding order (0-indexed).
 *
 * For 8 players: [0, 7, 3, 4, 1, 6, 2, 5]
 * → Seed1 vs Seed8, Seed4 vs Seed5, Seed2 vs Seed7, Seed3 vs Seed6
 */
export function standardSeeding(numPlayers: number): number[] {
  if (numPlayers === 1) return [0];
  if (numPlayers === 2) return [0, 1];

  const half = numPlayers / 2;
  const upper = standardSeeding(half);
  const lower = standardSeeding(half);

  const result: number[] = [];
  for (let i = 0; i < half; i++) {
    result.push(upper[i]);
    result.push(numPlayers - 1 - lower[i]);
  }
  return result;
}

// --- Main ---

/**
 * Generate a single-elimination bracket from seeded players.
 *
 * @param seeds Ordered list of player IDs by seed (index 0 = seed 1)
 * @param topCutSize Number of players in top cut (must be power of 2)
 * @returns Array of BracketMatchOutput for all matches in the bracket
 */
export function generateSingleElimBracket(
  seeds: string[],
  topCutSize: number
): BracketMatchOutput[] {
  if (topCutSize < 2) {
    throw new Error(`top_cut_size must be at least 2, got ${topCutSize}`);
  }

  if (seeds.length < topCutSize) {
    throw new Error(
      `Need at least ${topCutSize} seeds for top cut of ${topCutSize}, got ${seeds.length}`
    );
  }

  // Find the next power of 2 for the bracket structure
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(topCutSize)));
  const numRounds = Math.log2(bracketSize);
  
  // Pad seeds with nulls (byes) up to the bracket size
  const actualSeeds = seeds.slice(0, topCutSize);
  while (actualSeeds.length < bracketSize) {
    actualSeeds.push(null as any); // Use null for bye spots
  }
  
  const seedingOrder = standardSeeding(bracketSize);

  const matches: BracketMatchOutput[] = [];

  // Round 1: pair seeds according to bracket seeding
  const round1Matches = bracketSize / 2;
  for (let pos = 0; pos < round1Matches; pos++) {
    const seedAIdx = seedingOrder[pos * 2];
    const seedBIdx = seedingOrder[pos * 2 + 1];

    const player1 = actualSeeds[seedAIdx] || null;
    const player2 = actualSeeds[seedBIdx] || null;

    const nextRound = numRounds > 1 ? 2 : null;
    const nextPosition = nextRound ? Math.floor(pos / 2) : null;

    matches.push({
      bracketRound: 1,
      bracketPosition: pos,
      player1Id: player1,
      player2Id: player2,
      feedsWinnerToRound: nextRound,
      feedsWinnerToPosition: nextPosition,
    });
  }

  // Subsequent rounds: empty slots filled as matches complete
  for (let roundNum = 2; roundNum <= numRounds; roundNum++) {
    const matchesInRound = bracketSize / Math.pow(2, roundNum);
    for (let pos = 0; pos < matchesInRound; pos++) {
      const nextRound = roundNum < numRounds ? roundNum + 1 : null;
      const nextPosition = nextRound ? Math.floor(pos / 2) : null;

      matches.push({
        bracketRound: roundNum,
        bracketPosition: pos,
        player1Id: null,
        player2Id: null,
        feedsWinnerToRound: nextRound,
        feedsWinnerToPosition: nextPosition,
      });
    }
  }

  return matches;
}
