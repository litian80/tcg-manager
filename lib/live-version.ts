export interface LiveVersionMatch {
  is_finished?: boolean | null;
  round_number?: number | null;
  outcome?: number | null;
}

/**
 * A cheap fingerprint of a tournament's live state. It changes whenever a
 * result is entered, corrected, or a new round/pairing is posted — which lets
 * spectators detect "something changed" by polling a tiny value instead of
 * subscribing to Realtime. Computed identically on the server (initial value)
 * and in the poll endpoint so the two are comparable.
 */
export function computeLiveVersion(matches: LiveVersionMatch[]): string {
  let total = 0;
  let finished = 0;
  let maxRound = 0;
  let resultAcc = 0;

  for (const m of matches) {
    total++;
    if (m.is_finished) finished++;
    const round = m.round_number ?? 0;
    if (round > maxRound) maxRound = round;
    resultAcc += m.outcome ?? 0;
  }

  return `${total}:${finished}:${maxRound}:${resultAcc}`;
}
