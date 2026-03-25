import { describe, it, expect } from 'vitest'
import { cn, sanitizeSearchQuery, formatDate, formatDateTime, getTournamentStatusConfig } from '@/lib/utils'

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
  it('formats ISO string to yyyy-MM-dd', () => {
    expect(formatDate('2026-03-25T12:00:00')).toBe('2026-03-25')
  })

  it('formats Date object to yyyy-MM-dd', () => {
    expect(formatDate(new Date(2026, 2, 25))).toBe('2026-03-25')
  })

  it('formats date-only string', () => {
    expect(formatDate('2026-12-01')).toBe('2026-12-01')
  })
})

describe('formatDateTime', () => {
  it('formats ISO string to yyyy-MM-dd HH:mm', () => {
    const result = formatDateTime('2026-03-25T14:30:00')
    expect(result).toBe('2026-03-25 14:30')
  })

  it('formats Date object to yyyy-MM-dd HH:mm', () => {
    const result = formatDateTime(new Date(2026, 2, 25, 9, 5))
    expect(result).toBe('2026-03-25 09:05')
  })
})

describe('getTournamentStatusConfig', () => {
  it('maps "running" to Live with green badge', () => {
    const config = getTournamentStatusConfig('running')
    expect(config.label).toBe('Live')
    expect(config.variant).toBe('default')
    expect(config.className).toContain('bg-green-600')
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
