import { describe, it, expect, vi } from 'vitest'
import { safeAction, type ActionResult } from '@/lib/safe-action'

// Mock the auth module's isRedirectError
vi.mock('@/lib/auth', () => ({
  isRedirectError: (error: unknown): error is { digest: string } => {
    return !!(
      error &&
      typeof error === 'object' &&
      'digest' in error &&
      typeof (error as any).digest === 'string' &&
      (error as any).digest.startsWith('NEXT_REDIRECT')
    )
  },
}))

describe('safeAction', () => {
  it('passes through successful results unchanged', async () => {
    const result = await safeAction(async () => ({
      success: { id: '123', name: 'Test' } as any,
    }))
    expect(result.success).toEqual({ id: '123', name: 'Test' })
    expect(result.error).toBeUndefined()
  })

  it('passes through error results unchanged', async () => {
    const result = await safeAction(async () => ({
      error: 'Validation failed',
    }))
    expect(result.error).toBe('Validation failed')
    expect(result.success).toBeUndefined()
  })

  it('catches thrown Error and returns { error }', async () => {
    const result = await safeAction(async () => {
      throw new Error('Database connection failed')
    })
    expect(result.error).toBe('Database connection failed')
    expect(result.success).toBeUndefined()
  })

  it('catches non-Error throws and returns generic message', async () => {
    const result = await safeAction(async () => {
      throw 'string error'
    })
    expect(result.error).toBe('An unexpected error occurred')
  })

  it('re-throws Next.js redirect errors', async () => {
    const redirectError = { digest: 'NEXT_REDIRECT;/dashboard' }
    await expect(
      safeAction(async () => {
        throw redirectError
      })
    ).rejects.toEqual(redirectError)
  })

  it('works with typed ActionResult', async () => {
    type User = { id: string; name: string }
    const result: ActionResult<User> = await safeAction<User>(async () => ({
      success: { id: '1', name: 'Alice' },
    }))
    expect(result.success?.name).toBe('Alice')
  })
})
