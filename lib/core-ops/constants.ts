/**
 * Core Ops — Outcome constants and match point values.
 *
 * TOM-compatible integer codes stored in public.matches.outcome.
 * Must remain backward-compatible with existing TOM data imports.
 */

/** TOM-compatible match outcome codes */
export const Outcome = {
  NOT_REPORTED: 0,
  PLAYER1_WIN: 1,
  PLAYER2_WIN: 2,
  TIE: 3, // includes Intentional Draws
  BYE: 5,
} as const;

export type OutcomeCode = (typeof Outcome)[keyof typeof Outcome];

export function isDecided(outcome: number | null | undefined): boolean {
  return outcome === Outcome.PLAYER1_WIN
    || outcome === Outcome.PLAYER2_WIN
    || outcome === Outcome.TIE
    || outcome === Outcome.BYE;
}

export function outcomeLabel(outcome: number | null | undefined): string {
  const labels: Record<number, string> = {
    [Outcome.NOT_REPORTED]: "Not Reported",
    [Outcome.PLAYER1_WIN]: "Player 1 Win",
    [Outcome.PLAYER2_WIN]: "Player 2 Win",
    [Outcome.TIE]: "Tie",
    [Outcome.BYE]: "Bye",
  };
  return outcome != null ? (labels[outcome] ?? `Unknown (${outcome})`) : "Not Reported";
}

/** Match point values per Pokémon TCG Tournament Rules */
export const MATCH_WIN_POINTS = 3;
export const MATCH_TIE_POINTS = 1;
export const MATCH_LOSS_POINTS = 0;
export const MATCH_BYE_POINTS = 3; // Bye is treated as a win

/** Minimum 25% for win percentage calculations */
export const MWP_FLOOR = 0.25;
