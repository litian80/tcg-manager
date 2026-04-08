'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sanitizeSearchQuery } from '@/lib/utils'
import { safeAction, type ActionResult } from '@/lib/safe-action'

import { z } from 'zod'

const RoleSchema = z.enum(['admin', 'organizer', 'user'])
export type AppRole = z.infer<typeof RoleSchema>

export async function searchUsers(
    query: string,
    sortKey: string = 'created_at',
    sortDirection: 'asc' | 'desc' = 'desc',
    filterRole: string = 'all'
) {
    const supabase = await createClient()

    // 1. Check if current user is admin
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        return []
    }

    // 2. Find users with pending organiser applications (always shown at top)
    const { data: pendingApps } = await supabase
        .from('organiser_applications')
        .select('user_id')
        .eq('status', 'pending')

    const pendingUserIds = (pendingApps || []).map(a => a.user_id)

    // Helper: apply filters and sorting
    const applyFiltersAndSorting = (q: any) => {
        let modifiedQuery = q
        if (filterRole && filterRole !== 'all') {
            modifiedQuery = modifiedQuery.eq('role', filterRole)
        }
        return modifiedQuery.order(sortKey, { ascending: sortDirection === 'asc' })
    }

    // 3. Perform Search
    if (!query) {
        // Fetch pending users first
        let pendingUsers: any[] = []
        if (pendingUserIds.length > 0) {
            let pendingQuery = supabase
                .from('profiles')
                .select('*')
                .in('id', pendingUserIds)
            
            pendingQuery = applyFiltersAndSorting(pendingQuery)
            
            const { data } = await pendingQuery
            pendingUsers = data || []
        }

        // Fetch remaining users (excluding pending ones)
        let remainingQuery = supabase
            .from('profiles')
            .select('*')
            .limit(20)

        remainingQuery = applyFiltersAndSorting(remainingQuery)

        if (pendingUserIds.length > 0) {
            // Supabase doesn't have a NOT IN filter directly, use .not() with .in()
            for (const pid of pendingUserIds) {
                remainingQuery = remainingQuery.neq('id', pid)
            }
        }

        const { data: remainingUsers, error } = await remainingQuery

        if (error) {
            console.error('Search error:', error)
            return pendingUsers // At least return pending users if the second query fails
        }

        return [...pendingUsers, ...(remainingUsers || [])]
    }

    const sanitized = sanitizeSearchQuery(query)
    let searchQuery = supabase
        .from('profiles')
        .select('*')
        .or(`email.ilike.%${sanitized}%,first_name.ilike.%${sanitized}%,last_name.ilike.%${sanitized}%,pokemon_player_id.ilike.%${sanitized}%`)
        .limit(20)

    searchQuery = applyFiltersAndSorting(searchQuery)

    const { data, error } = await searchQuery

    if (error) {
        console.error('Search error:', error)
        return []
    }

    // Sort search results: pending applicants first
    if (pendingUserIds.length > 0 && data) {
        const pendingSet = new Set(pendingUserIds)
        return data.sort((a, b) => {
            const ap = pendingSet.has(a.id) ? 0 : 1
            const bp = pendingSet.has(b.id) ? 0 : 1
            if (ap !== bp) return ap - bp;
            // Otherwise maintain existing sorted order
            return 0;
        })
    }

    return data
}

export type UpdatePayload = {
    pokemon_player_id: string
    birth_year: string
}

export async function adminUpdateUser(targetUserId: string, payload: UpdatePayload): Promise<ActionResult> {
    return safeAction(async () => {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: "Unauthorized" }

        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profile?.role !== 'admin') {
            return { error: "Forbidden: Admins only" }
        }

        const adminSupabase = createAdminClient()
        const { error } = await adminSupabase
            .from('profiles')
            .update({
                pokemon_player_id: payload.pokemon_player_id || null,
                birth_year: payload.birth_year ? parseInt(payload.birth_year) : null
            })
            .eq('id', targetUserId)

        if (error) {
            return { error: error.message }
        }

        revalidatePath('/admin/users')
        return { success: true }
    });
}

export async function updateUserRole(targetUserId: string, newRole: AppRole): Promise<ActionResult> {
    return safeAction(async () => {
        const supabase = await createClient()

        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return { error: 'Unauthorized' }

        const { data: currentUserProfile, error: profileError } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (profileError || !currentUserProfile) {
            return { error: 'Failed to verify permissions' }
        }

        if (currentUserProfile.role !== 'admin') {
            return { error: 'Unauthorized: Only admins can change roles' }
        }

        if (targetUserId === user.id) {
            return { error: 'Cannot change your own role to prevent lockout.' }
        }

        const adminSupabase = createAdminClient()
        const { error: updateError } = await adminSupabase
            .from('profiles')
            .update({ role: newRole })
            .eq('id', targetUserId)

        if (updateError) {
            console.error('Error updating role:', updateError)
            return { error: 'Failed to update role' }
        }

        revalidatePath('/admin/users')
        return { success: true }
    });
}
