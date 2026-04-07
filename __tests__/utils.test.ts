import { describe, it, expect } from 'vitest'
import { cn, sanitizeSearchQuery, formatDate, formatDateTime, formatDateTimeCompact, formatTime, formatTimeShort, getTournamentStatusConfig } from '@/lib/utils'

describe('cn (classname merge)', () => {
  it('merges class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', false && 'hidden', 'visible')).toBe('base visible')
  })

  it('deduplicates Tailwind classes', () => {
    const result = cn('p-4', 'p-2')
    expect(result).toBe('p-2')
  })

  it('handles empty/undefined input', () => {
    expect(cn()).toBe('')
    expect(cn(undefined, null, '')).toBe('')
  })
})

describe('sanitizeSearchQuery', () => {
  it('removes PostgREST operator characters', () => {
    expect(sanitizeSearchQuery('hello,world')).toBe('helloworld')
    expect(sanitizeSearchQuery('test.value')).toBe('testvalue')
    expect(sanitizeSearchQuery('(injection)')).toBe('injection')
    expect(sanitizeSearchQuery('"quoted"')).toBe('quoted')
    expect(sanitizeSearchQuery('back\\slash')).toBe('backslash')
  })

  it('preserves safe characters', () => {
    expect(sanitizeSearchQuery('John Doe')).toBe('John Doe')
    expect(sanitizeSearchQuery('player-123')).toBe('player-123')
    expect(sanitizeSearchQuery("O'Brien")).toBe("O'Brien")
  })

  it('handles empty string', () => {
    expect(sanitizeSearchQuery('')).toBe('')
  })

  it('prevents filter injection with commas', () => {
    // A comma in PostgREST separates filter clauses
    const malicious = 'name,role.eq.admin'
    const sanitized = sanitizeSearchQuery(malicious)
    expect(sanitized).not.toContain(',')
    expect(sanitized).not.toContain('.')
  })
})

describe('formatDate', () => {
  it('formats ISO string to human-friendly date', () => {
    // Intl with en-GB: "25 Mar 2026"
    const result = formatDate('2026-03-25T12:00:00')
    expect(result).toMatch(/25 Mar 2026/)
  })

  it('formats Date object to human-friendly date', () => {
    const result = formatDate(new Date(2026, 2, 25))
    expect(result).toMatch(/25 Mar 2026/)
  })

  it('formats date-only string', () => {
    const result = formatDate('2026-12-01')
    expect(result).toMatch(/1 Dec 2026/)
  })
})

describe('formatDateTime', () => {
  it('includes timezone abbreviation', () => {
    const result = formatDateTime('2026-03-25T14:30:00')
    // Should contain date, time, and a timezone abbreviation
    expect(result).toMatch(/25 Mar 2026/)
    expect(result).toMatch(/\d{1,2}:\d{2}/)
    // Timezone abbreviation should be present (e.g. NZDT, EST, UTC, GMT+13, etc.)
    expect(result).toMatch(/[A-Z]{2,5}|GMT[+-]\d+/)
  })

  it('formats Date object with timezone', () => {
    const result = formatDateTime(new Date(2026, 2, 25, 9, 5))
    expect(result).toMatch(/25 Mar 2026/)
    expect(result).toMatch(/9:05/)
  })
})

describe('formatDateTimeCompact', () => {
  it('omits year but includes timezone', () => {
    const result = formatDateTimeCompact('2026-03-25T14:30:00')
    // Should have month + day but NOT the year
    expect(result).toMatch(/25 Mar/)
    expect(result).not.toMatch(/2026/)
    // Should have timezone abbreviation
    expect(result).toMatch(/[A-Z]{2,5}|GMT[+-]\d+/)
  })
})

describe('formatTime', () => {
  it('shows time with timezone abbreviation', () => {
    const result = formatTime('2026-03-25T14:30:00')
    expect(result).toMatch(/\d{1,2}:\d{2}/)
    expect(result).toMatch(/[A-Z]{2,5}|GMT[+-]\d+/)
  })
})

describe('formatTimeShort', () => {
  it('shows time without timezone', () => {
    const result = formatTimeShort('2026-03-25T14:30:00')
    expect(result).toMatch(/\d{1,2}:\d{2}/)
    // Should NOT have a timezone abbreviation
    expect(result).not.toMatch(/[A-Z]{3,5}/)
  })

  it('uses 12-hour format with AM/PM', () => {
    const result = formatTimeShort('2026-03-25T14:30:00')
    expect(result).toMatch(/am|pm/i)
  })
})

describe('getTournamentStatusConfig', () => {
  it('maps "running" to Live with green badge', () => {
    const config = getTournamentStatusConfig('running')
    expect(config.label).toBe('Live')
    expect(config.variant).toBe('default')
    expect(config.className).toContain('bg-green-600')
  })

  it('maps "not_started" to Upcoming with blue outline badge', () => {
    const config = getTournamentStatusConfig('not_started')
    expect(config.label).toBe('Upcoming')
    expect(config.variant).toBe('outline')
    expect(config.className).toContain('text-blue-600')
  })

  it('maps "completed" to Completed with secondary badge', () => {
    const config = getTournamentStatusConfig('completed')
    expect(config.label).toBe('Completed')
    expect(config.variant).toBe('secondary')
  })

  it('title-cases unknown statuses with outline badge', () => {
    const config = getTournamentStatusConfig('draft')
    expect(config.label).toBe('Draft')
    expect(config.variant).toBe('outline')
  })

  it('title-cases multi-word unknown statuses', () => {
    const config = getTournamentStatusConfig('pending')
    expect(config.label).toBe('Pending')
    expect(config.variant).toBe('outline')
  })
})
