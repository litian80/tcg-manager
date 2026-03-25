import { isRedirectError } from '@/lib/auth'

/**
 * Standardized return type for all server actions.
 * Guarantees either `success` or `error` is present, never a raw throw.
 */
export type ActionResult<T = true> = {
  success?: T
  error?: string
}

/**
 * Wraps a server action function in try/catch, guaranteeing an ActionResult return.
 * - Successful results pass through unchanged.
 * - Thrown errors are caught and returned as `{ error: message }`.
 * - Next.js redirect errors are re-thrown (required for redirect() to work).
 */
export async function safeAction<T = true>(
  fn: () => Promise<ActionResult<T>>
): Promise<ActionResult<T>> {
  try {
    return await fn()
  } catch (err) {
    // Next.js redirect() throws a special error that must be re-thrown
    if (isRedirectError(err)) throw err

    console.error('[safeAction]', err)
    const message =
      err instanceof Error ? err.message : 'An unexpected error occurred'
    return { error: message }
  }
}
