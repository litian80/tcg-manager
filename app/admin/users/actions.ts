'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'
import { sanitizeSearchQuery } from '@/lib/utils'
import { safeAction, type ActionResult } from '@/lib/safe-action'

import { z } from 'zod'

const RoleSchema = z.enum(['admin', 'organizer', 'judge', 'user'])
export type AppRole = z.infer<typeof RoleSchema>

export async function searchUsers(query: string) {
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

    // 2. Perform Search
    if (!query) {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('first_name', { ascending: true })
            .limit(20)

        if (error) {
            console.error('Search error:', error)
            return []
        }
        return data
    }

    const sanitized = sanitizeSearchQuery(query)
    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.ilike.%${sanitized}%,first_name.ilike.%${sanitized}%,last_name.ilike.%${sanitized}%,pokemon_player_id.ilike.%${sanitized}%`)
        .limit(20)

    if (error) {
        console.error('Search error:', error)
        return []
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
