/**
 * Core Ops — Tournament Operations Engine.
 *
 * Public API for Swiss pairing, tiebreaker calculation,
 * and bracket generation. All computation runs in-process
 * on Vercel server actions (no external service needed).
 */

export { Outcome, MWP_FLOOR, MATCH_WIN_POINTS, MATCH_TIE_POINTS, MATCH_BYE_POINTS, isDecided, outcomeLabel } from "./constants";
export { computeMwp, computeOmwp, computeOomwp, computeStandings } from "./tiebreakers";
export type { PlayerRecord, StandingEntry } from "./tiebreakers";
export { generatePairings } from "./pairing";
export type { PlayerInput, PairingRecord, PairingConfig, PairingOutput, PairingResult } from "./pairing";
export { generateSingleElimBracket, standardSeeding } from "./bracket";
export type { BracketMatchOutput } from "./bracket";
