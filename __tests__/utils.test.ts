import { describe, it, expect } from 'vitest'
import { cn, sanitizeSearchQuery } from '@/lib/utils'

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
