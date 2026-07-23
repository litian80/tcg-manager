/**
 * Core Ops — Swiss Pairing Engine using Edmonds' Blossom algorithm.
 *
 * Port from Python pairing.py. Uses `edmonds-blossom` npm package
 * instead of NetworkX for maximum weight matching.
 *
 * Edge Weight Scheme:
 *   Same score group:     BASE = 1000
 *   Cross score group:    BASE = 1000 - |point_diff|² × 10  (quadratic penalty)
 *   Previous opponents:   Edge REMOVED entirely
 *   Bye Dummy Node:       weight = rank_order × 100 + 1 (lower ranked → higher weight)
 *                          Edge removed if player already had a bye
 */

import blossom from "edmonds-blossom";

// --- Types ---

export interface PlayerInput {
  id: string;
  matchPoints: number;
  isDropped: boolean;
  hasBye: boolean;
  /** IDs of previously faced opponents */
  opponents: string[];
}

export interface PairingRecord {
  p1: string;
  p2: string;
  round: number;
}

export interface PairingConfig {
  allowByes: boolean;
}

export interface PairingOutput {
  p1: string;
  p2: string;
  tableNumber: number;
}

export interface PairingResult {
  pairings: PairingOutput[];
  byePlayer: string | null;
}

// --- Constants ---

const BYE_SENTINEL = "__BYE__";

// --- Internal Helpers ---

function buildOpponentSets(
  players: PlayerInput[],
  previousPairings: PairingRecord[]
): Map<string, Set<string>> {
  const opponents = new Map<string, Set<string>>();

  for (const p of players) {
    if (!opponents.has(p.id)) opponents.set(p.id, new Set());
    for (const opp of p.opponents) {
      opponents.get(p.id)!.add(opp);
    }
  }

  for (const rec of previousPairings) {
    if (!opponents.has(rec.p1)) opponents.set(rec.p1, new Set());
    if (!opponents.has(rec.p2)) opponents.set(rec.p2, new Set());
    opponents.get(rec.p1)!.add(rec.p2);
    opponents.get(rec.p2)!.add(rec.p1);
  }

  return opponents;
}

function computeEdgeWeight(p1: PlayerInput, p2: PlayerInput): number {
  const pointDiff = Math.abs(p1.matchPoints - p2.matchPoints);
  if (pointDiff === 0) return 1000;
  // Quadratic penalty: big gaps cost disproportionately more than small ones.
  // This prevents Blossom from choosing one large gap (e.g. 4-0 vs 1-3)
  // when multiple small floats (e.g. 3× one-bracket floats) yield the same total.
  return Math.max(1, 1000 - pointDiff * pointDiff * 10);
}

// --- Main Function ---

/**
 * Generate Swiss pairings using Blossom algorithm.
 *
 * @param players Active players to pair
 * @param previousPairings All previous pairings in this tournament
 * @param config Configuration (allow byes etc.)
 * @returns PairingResult with pairings and bye player
 * @throws Error if pairing is impossible
 */
export function generatePairings(
  players: PlayerInput[],
  previousPairings: PairingRecord[] = [],
  config: PairingConfig = { allowByes: true }
): PairingResult {
  // Filter to active (non-dropped) players
  const activePlayers = players.filter((p) => !p.isDropped);

  if (activePlayers.length < 2) {
    throw new Error("Need at least 2 active players to generate pairings.");
  }

  const opponentSets = buildOpponentSets(activePlayers, previousPairings);
  const needsBye = activePlayers.length % 2 === 1;

  // Build node list: all active players + optional bye sentinel
  const nodeIds: string[] = activePlayers.map((p) => p.id);
  if (needsBye && config.allowByes) {
    nodeIds.push(BYE_SENTINEL);
  }

  // Create index mapping: playerID → integer node index
  const idToIndex = new Map<string, number>();
  for (let i = 0; i < nodeIds.length; i++) {
    idToIndex.set(nodeIds[i], i);
  }

  const playerMap = new Map(activePlayers.map((p) => [p.id, p]));

  // Sort players by match points descending for rank ordering
  const sortedPlayers = [...activePlayers].sort(
    (a, b) => b.matchPoints - a.matchPoints
  );
  const playerRank = new Map(sortedPlayers.map((p, rank) => [p.id, rank]));

  // Build edge list for Blossom: [nodeIdx1, nodeIdx2, weight]
  const edges: number[][] = [];

  // Add edges between all player pairs (excluding previous opponents)
  for (let i = 0; i < activePlayers.length; i++) {
    for (let j = i + 1; j < activePlayers.length; j++) {
      const pid1 = activePlayers[i].id;
      const pid2 = activePlayers[j].id;

      // Hard constraint: no rematches
      if (opponentSets.get(pid1)?.has(pid2)) continue;

      const weight = computeEdgeWeight(
        playerMap.get(pid1)!,
        playerMap.get(pid2)!
      );
      edges.push([idToIndex.get(pid1)!, idToIndex.get(pid2)!, weight]);
    }
  }

  // Add bye edges
  if (needsBye && config.allowByes) {
    const byeIdx = idToIndex.get(BYE_SENTINEL)!;
    // Scale bye weight so the lowest-ranked player's preference always
    // dominates over any possible improvement in player-player pairing.
    // Gap of N × 1000 per rank ensures bye assignment is unbreakable:
    // max pairing improvement ≤ (N/2) × 999 < N × 1000 = one rank gap.
    const BYE_WEIGHT_BASE = activePlayers.length * 1000;
    for (const p of activePlayers) {
      if (p.hasBye) continue; // Player already had a bye
      // Lower-ranked players get higher weight for bye
      const byeWeight = (playerRank.get(p.id) ?? 0) * BYE_WEIGHT_BASE + 1;
      edges.push([idToIndex.get(p.id)!, byeIdx, byeWeight]);
    }
  }

  // Run Blossom algorithm
  const mate: number[] = blossom(edges, true);

  if (!mate || mate.every((m) => m === -1)) {
    throw new Error("Failed to generate pairings — no valid matching found.");
  }

  // Extract results from mate array
  const pairingPairs: [string, string][] = [];
  let byePlayer: string | null = null;
  const seen = new Set<number>();

  for (let i = 0; i < mate.length; i++) {
    if (mate[i] === -1 || seen.has(i)) continue;
    const j = mate[i];
    seen.add(i);
    seen.add(j);

    const idA = nodeIds[i];
    const idB = nodeIds[j];

    if (idA === BYE_SENTINEL) {
      byePlayer = idB;
    } else if (idB === BYE_SENTINEL) {
      byePlayer = idA;
    } else {
      // Normalize order (lower ID first for determinism)
      const [lo, hi] = idA < idB ? [idA, idB] : [idB, idA];
      pairingPairs.push([lo, hi]);
    }
  }

  // --- Completeness validation ---
  // Verify every active player is covered by either a pairing or the bye.
  // This catches partial matches (blossom returns mate[i] === -1 for some
  // players) AND the case where mate is shorter than nodeIds (completely
  // isolated players whose high indices fall outside mate's range).
  const coveredIds = new Set<string>();
  for (const [a, b] of pairingPairs) {
    coveredIds.add(a);
    coveredIds.add(b);
  }
  if (byePlayer) coveredIds.add(byePlayer);

  const uncoveredPlayers = activePlayers.filter((p) => !coveredIds.has(p.id));

  // When byes are disabled and the player count is odd, exactly 1 player
  // will inevitably be left out — that's an expected limitation, not a bug.
  const expectedUncovered = needsBye && !config.allowByes ? 1 : 0;

  if (uncoveredPlayers.length > expectedUncovered) {
    const uncoveredIds = uncoveredPlayers.map((p) => p.id);
    throw new Error(
      `Failed to generate a complete pairing: ${uncoveredIds.length} player(s) could not be paired ` +
        `without a rematch: [${uncoveredIds.join(", ")}]. This usually happens when the field has ` +
        `asymmetric match histories (drops/re-adds, late entries).`
    );
  }

  // Sort pairings by combined match points descending (table 1 = highest scoring)
  pairingPairs.sort((a, b) => {
    const scoreA =
      (playerMap.get(a[0])?.matchPoints ?? 0) +
      (playerMap.get(a[1])?.matchPoints ?? 0);
    const scoreB =
      (playerMap.get(b[0])?.matchPoints ?? 0) +
      (playerMap.get(b[1])?.matchPoints ?? 0);
    return scoreB - scoreA;
  });

  // Assign table numbers (1-indexed)
  const pairings: PairingOutput[] = pairingPairs.map(([p1, p2], idx) => ({
    p1,
    p2,
    tableNumber: idx + 1,
  }));

  return { pairings, byePlayer };
}
