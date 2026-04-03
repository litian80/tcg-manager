export type MatchReportValue = 'win' | 'loss' | 'tie';

export type MatchReportingStatus = 
  | 'unreported' 
  | 'pending_opponent' 
  | 'conflict' 
  | 'confirmed';

export function getMatchReportingStatus(
  p1Report?: string | null,
  p2Report?: string | null
): MatchReportingStatus {
  if (!p1Report && !p2Report) return 'unreported';
  if (!p1Report || !p2Report) return 'pending_opponent';

  // Both reported
  if (p1Report === 'win' && p2Report === 'loss') return 'confirmed';
  if (p1Report === 'loss' && p2Report === 'win') return 'confirmed';
  if (p1Report === 'tie' && p2Report === 'tie') return 'confirmed';

  return 'conflict';
}
