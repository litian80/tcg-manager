import { describe, it, expect } from 'vitest';
import { computeLiveVersion } from '@/lib/live-version';

describe('computeLiveVersion', () => {
  it('is stable for the same state', () => {
    const matches = [
      { is_finished: true, round_number: 1, outcome: 1 },
      { is_finished: false, round_number: 2, outcome: null },
    ];
    expect(computeLiveVersion(matches)).toBe(computeLiveVersion([...matches]));
  });

  it('changes when a new result is entered', () => {
    const before = [{ is_finished: false, round_number: 1, outcome: null }];
    const after = [{ is_finished: true, round_number: 1, outcome: 2 }];
    expect(computeLiveVersion(after)).not.toBe(computeLiveVersion(before));
  });

  it('changes when a result is corrected (same finished count)', () => {
    const before = [{ is_finished: true, round_number: 1, outcome: 1 }];
    const after = [{ is_finished: true, round_number: 1, outcome: 2 }];
    expect(computeLiveVersion(after)).not.toBe(computeLiveVersion(before));
  });

  it('changes when a new round / pairings are posted', () => {
    const before = [{ is_finished: true, round_number: 1, outcome: 1 }];
    const after = [
      { is_finished: true, round_number: 1, outcome: 1 },
      { is_finished: false, round_number: 2, outcome: null },
    ];
    expect(computeLiveVersion(after)).not.toBe(computeLiveVersion(before));
  });

  it('handles an empty tournament', () => {
    expect(computeLiveVersion([])).toBe('0:0:0:0');
  });
});
