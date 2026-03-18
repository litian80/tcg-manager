import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { Role } from '@/lib/rbac'

export type TournamentAuthorizationResult = {
  isAuthorized: boolean
  tournament: any
  user: any
  profile: any
}

/**
 * Helper to detect Next.js redirect errors.
 * These must be re-thrown so Next.js can handle the redirect.
 */
export const isRedirectError = (error: unknown): error is { digest: string } => {
  return !!(
    error &&
    typeof error === 'object' &&
    'digest' in error &&
    typeof (error as any).digest === 'string' &&
    (error as any).digest.startsWith('NEXT_REDIRECT')
  )
}

/**
 * Unified error handler for auth errors in Server Components.
 */
export const handleAuthError = (error: unknown): never => {
  if (isRedirectError(error)) {
    throw error
  }
  
  if (error instanceof Error && error.message === 'Tournament not found') {
    throw error // Let the caller call notFound()
  }
  
  redirect('/?error=unauthorized')
}

/**
 * Get authenticated user with profile.
 * Redirects to login if not authenticated or profile not found.
 */
export async function getAuthenticatedUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login?redirect=/organizer/tournaments')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, pokemon_player_id, email')
    .eq('id', user.id)
    .single()

  if (error || !profile) {
    redirect('/login?message=Profile not found')
  }

  return { user, profile }
}

/**
 * Require organizer or admin role for route access.
 * Typically used in pages without a specific tournament context.
 */
export async function requireOrganizerOrAdmin() {
  try {
    const { user, profile } = await getAuthenticatedUser()

    if (profile.role !== 'admin' && profile.role !== 'organizer') {
      redirect('/?error=unauthorized')
    }

    return { user, profile }
  } catch (error) {
    return handleAuthError(error)
  }
}

/**
 * Authorize tournament management with three-tier access control:
 * 1. User is the tournament organizer (organizer_id)
 * 2. User is an admin (role = 'admin')
 * 3. User's POP ID matches the tournament's organizer_popid
 */
export async function authorizeTournamentManagement(
  tournamentId: string
): Promise<TournamentAuthorizationResult> {
  try {
    const supabase = await createClient()
    
    // 1. Get user and profile
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      redirect('/login')
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, pokemon_player_id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      redirect('/login?message=Could not fetch profile')
    }

    // 2. Get tournament
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('*')
      .eq('id', tournamentId)
      .single()

    if (tournamentError || !tournament) {
      throw new Error('Tournament not found')
    }

    // 3. Evaluate multi-tier authorization
    let isAuthorized = false

    if (profile.role === 'admin') {
      isAuthorized = true
    } else if (tournament.organizer_popid && profile.pokemon_player_id === tournament.organizer_popid) {
      isAuthorized = true
    }

    return {
      isAuthorized,
      tournament,
      user,
      profile
    }
  } catch (error) {
    return handleAuthError(error)
  }
}
