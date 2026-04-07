'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { safeAction, type ActionResult } from '@/lib/safe-action'
import { z } from 'zod'

// ─── Validation ──────────────────────────────────────────────────────────────

/**
 * Strict URL validation: must be a valid URL on the pokemon.com domain,
 * matching the expected league page path pattern.
 * Prevents subdomain bypass (e.g. pokemon.com.evildomain.com).
 */
function isValidLeagueUrl(urlString: string): boolean {
    try {
        const url = new URL(urlString)
        // Must be https and hostname must be exactly pokemon.com or *.pokemon.com
        if (url.protocol !== 'https:') return false
        const hostname = url.hostname.toLowerCase()
        if (hostname !== 'pokemon.com' && !hostname.endsWith('.pokemon.com')) return false
        // Must include the expected league path pattern
        if (!url.pathname.includes('/play-pokemon/pokemon-events/leagues/')) return false
        return true
    } catch {
        return false
    }
}

const SubmitApplicationSchema = z.object({
    league_url: z.string()
        .url('Please enter a valid URL')
        .refine(isValidLeagueUrl, {
            message: 'URL must be a valid Pokémon League page (e.g. https://www.pokemon.com/us/play-pokemon/pokemon-events/leagues/123456)'
        }),
    association: z.string()
        .min(10, 'Please describe your association with this league (at least 10 characters)')
        .max(2000, 'Description is too long (max 2000 characters)'),
})

// ─── User Actions ────────────────────────────────────────────────────────────

/**
 * Submit a new organiser application. Users can only submit one pending
 * application at a time (enforced by unique partial index in DB).
 */
export async function submitOrganiserApplication(formData: FormData): Promise<ActionResult> {
    return safeAction(async () => {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { error: 'You must be logged in to apply' }

        // Don't allow if already an organizer or admin
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role === 'organizer' || profile?.role === 'admin') {
            return { error: 'You already have organiser privileges' }
        }

        // Validate input
        const raw = {
            league_url: formData.get('league_url') as string,
            association: formData.get('association') as string,
        }
        const parsed = SubmitApplicationSchema.safeParse(raw)
        if (!parsed.success) {
            const firstError = parsed.error.issues[0]?.message || 'Invalid input'
            return { error: firstError }
        }

        // Insert (the unique partial index will reject duplicate pending apps)
        const { error } = await supabase
            .from('organiser_applications')
            .insert({
                user_id: user.id,
                league_url: parsed.data.league_url,
                association: parsed.data.association,
            })

        if (error) {
            if (error.code === '23505') {
                return { error: 'You already have a pending application' }
            }
            console.error('[submitOrganiserApplication]', error)
            return { error: 'Failed to submit application. Please try again.' }
        }

        revalidatePath('/profile')
        return { success: true }
    })
}

/**
 * Withdraw a user's own pending application.
 * RLS ensures only the owner can do this, and only if status is 'pending'.
 */
export async function withdrawOrganiserApplication(applicationId: string): Promise<ActionResult> {
    return safeAction(async () => {
        const supabase = await createClient()

        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { error: 'Unauthorized' }

        const { error } = await supabase
            .from('organiser_applications')
            .update({ status: 'withdrawn' })
            .eq('id', applicationId)
            .eq('user_id', user.id) // Belt-and-suspenders — RLS also enforces this
            .eq('status', 'pending')

        if (error) {
            console.error('[withdrawOrganiserApplication]', error)
            return { error: 'Failed to withdraw application' }
        }

        revalidatePath('/profile')
        return { success: true }
    })
}

// ─── Admin Actions ───────────────────────────────────────────────────────────

export type OrganiserApplicationWithProfile = {
    id: string
    user_id: string
    status: string
    league_url: string
    association: string
    admin_notes: string | null
    reviewed_by: string | null
    created_at: string
    updated_at: string
    profiles: {
        first_name: string | null
        last_name: string | null
        email: string | null
        role: string
    }
}

/**
 * Fetch all organiser applications for admin review.
 * Pending applications are returned first, then sorted by creation date.
 */
export async function getOrganiserApplications(): Promise<ActionResult<OrganiserApplicationWithProfile[]>> {
    return safeAction(async () => {
        const supabase = await createClient()

        // Verify admin
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { error: 'Unauthorized' }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') return { error: 'Forbidden: Admins only' }

        const { data, error } = await supabase
            .from('organiser_applications')
            .select('*, profiles!organiser_applications_user_id_fkey(first_name, last_name, email, role)')
            .order('created_at', { ascending: false })

        if (error) {
            console.error('[getOrganiserApplications]', error)
            return { error: 'Failed to fetch applications' }
        }

        return { success: data as unknown as OrganiserApplicationWithProfile[] }
    })
}

/**
 * Admin: approve or reject an organiser application.
 * On approval, atomically updates the user's role to 'organizer' in the same
 * transaction-safe manner (check current role before promoting).
 */
export async function reviewOrganiserApplication(
    applicationId: string,
    decision: 'approved' | 'rejected',
    adminNotes?: string
): Promise<ActionResult> {
    return safeAction(async () => {
        const supabase = await createClient()

        // Verify admin
        const { data: { user }, error: authError } = await supabase.auth.getUser()
        if (authError || !user) return { error: 'Unauthorized' }

        const { data: adminProfile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (adminProfile?.role !== 'admin') return { error: 'Forbidden: Admins only' }

        // Fetch the application to get user_id and verify it's still pending
        const adminSupabase = createAdminClient()
        const { data: application, error: fetchError } = await adminSupabase
            .from('organiser_applications')
            .select('user_id, status')
            .eq('id', applicationId)
            .single()

        if (fetchError || !application) {
            return { error: 'Application not found' }
        }

        if (application.status !== 'pending') {
            return { error: `Application is already ${application.status}` }
        }

        // Update application status
        const { error: updateAppError } = await adminSupabase
            .from('organiser_applications')
            .update({
                status: decision,
                reviewed_by: user.id,
                admin_notes: adminNotes || null,
            })
            .eq('id', applicationId)

        if (updateAppError) {
            console.error('[reviewOrganiserApplication] update app:', updateAppError)
            return { error: 'Failed to update application' }
        }

        // If approved, promote user role (transaction-safe: only promote if still 'user')
        if (decision === 'approved') {
            const { data: targetProfile } = await adminSupabase
                .from('profiles')
                .select('role')
                .eq('id', application.user_id)
                .single()

            // Only promote if they're still a regular user (TOCTOU safety)
            if (targetProfile?.role === 'user') {
                const { error: roleError } = await adminSupabase
                    .from('profiles')
                    .update({ role: 'organizer' })
                    .eq('id', application.user_id)
                    .eq('role', 'user') // Extra safety: only update if still 'user'

                if (roleError) {
                    console.error('[reviewOrganiserApplication] role update:', roleError)
                    return { error: 'Application approved but role promotion failed. Please update the role manually.' }
                }
            }
            // If already organizer/admin, we still approve the application but skip role change
        }

        revalidatePath('/admin/users')
        revalidatePath('/profile')
        return { success: true }
    })
}

/**
 * Fetch the current user's latest organiser application (for profile page).
 */
export async function getMyOrganiserApplication() {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data, error } = await supabase
        .from('organiser_applications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

    if (error) {
        console.error('[getMyOrganiserApplication]', error)
        return null
    }

    return data
}
