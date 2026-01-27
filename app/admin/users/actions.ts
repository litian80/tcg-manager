'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin'
import { revalidatePath } from 'next/cache'

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
        // Return recent users if no query
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .order('first_name', { ascending: true })
            .limit(20)

        if (error) throw error
        return data
    }

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .or(`email.ilike.%${query}%,first_name.ilike.%${query}%,last_name.ilike.%${query}%,pokemon_player_id.ilike.%${query}%`)
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

export async function adminUpdateUser(targetUserId: string, payload: UpdatePayload) {
    const supabase = await createClient()

    // 1. Verify Admin (Double check securely on server)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profile?.role !== 'admin') {
        throw new Error("Forbidden: Admins only")
    }

    // 2. Perform Update
    // Note: Database trigger 'check_sensitive_updates' allows admins to modify these fields.
    // Use Admin Client to bypass RLS policies that restrict updates to "own profile only"
    const adminSupabase = createAdminClient()
    const { error } = await adminSupabase
        .from('profiles')
        .update({
            pokemon_player_id: payload.pokemon_player_id || null,
            birth_year: payload.birth_year ? parseInt(payload.birth_year) : null
        })
        .eq('id', targetUserId)

    if (error) {
        throw new Error(error.message)
    }

    revalidatePath('/admin/users')
    return { success: true }
}

import { z } from 'zod'

const RoleSchema = z.enum(['admin', 'organizer', 'judge', 'user'])
export type AppRole = z.infer<typeof RoleSchema>

export async function updateUserRole(targetUserId: string, newRole: AppRole) {
    const supabase = await createClient()

    // 1. Authentication
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        throw new Error('Unauthorized')
    }

    // 2. Authorization (Check if caller is admin)
    const { data: currentUserProfile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single()

    if (profileError || !currentUserProfile) {
        throw new Error('Failed to verify permissions')
    }

    if (currentUserProfile.role !== 'admin') {
        throw new Error('Unauthorized: Only admins can change roles')
    }

    // 3. Self-Protection
    if (targetUserId === user.id) {
        throw new Error('Cannot change your own role to prevent lockout.')
    }

    // 4. Operation
    // Use Admin Client to bypass RLS
    const adminSupabase = createAdminClient()
    const { error: updateError } = await adminSupabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', targetUserId)

    if (updateError) {
        console.error('Error updating role:', updateError)
        throw new Error('Failed to update role')
    }

    // 5. Revalidation
    revalidatePath('/admin/users')

    return { success: true }
}
