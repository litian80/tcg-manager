import { revalidatePath } from 'next/cache';
import { updateTag } from 'next/cache';

/**
 * PERF-003: Centralized cache invalidation helpers.
 *
 * Two scopes:
 * - Tournament-specific: Clears cached data for a single tournament's
 *   detail/matches/roster pages. Uses revalidatePath since tournament-scoped
 *   cache tags with dynamic IDs don't work with unstable_cache.
 * - Public listings: Clears cached stats and tournament lists on the
 *   landing page. Uses updateTag for immediate consistency in Server Actions
 *   (Next.js 16 recommends updateTag over revalidateTag for user-facing mutations).
 */

/**
 * Purges ALL cached data for a specific tournament page.
 * Call this after any mutation that changes tournament-specific data
 * (TDF upload, score submission, roster changes, etc.)
 */
export function invalidateTournament(id: string) {
  revalidatePath(`/tournament/${id}`);
}

/**
 * Purges cached landing page stats and public tournament list.
 * Call this after any mutation that changes aggregate data visible
 * on the landing page (tournament create/cancel, player registration, etc.)
 *
 * Uses updateTag (Next.js 16) for immediate read-your-own-writes consistency.
 */
export function invalidatePublicListings() {
  updateTag('public-tournaments');
  updateTag('landing-stats');
}
