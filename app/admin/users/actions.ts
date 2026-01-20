'use server'

import { createClient } from '@/utils/supabase/server'
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
    const { error } = await supabase
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
