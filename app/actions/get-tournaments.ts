'use server'

import { createClient } from "@/utils/supabase/server";
import { Database } from "@/utils/supabase/database.types";

type Tournament = Database['public']['Tables']['tournaments']['Row'];

interface GetTournamentsParams {
    limit?: number;
    offset?: number;
    searchQuery?: string;
}

export async function getTournaments({
    limit = 20,
    offset = 0,
    searchQuery = ''
}: GetTournamentsParams = {}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    // 1. ANONYMOUS / GUEST USER
    if (!user) {
        let query = supabase
            .from('tournaments')
            .select('*')
            .eq('is_published', true)
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (searchQuery) {
            query = query.ilike('name', `%${searchQuery}%`);
        }

        const { data, error } = await query;
        if (error) {
            console.error('Error fetching public tournaments:', error);
            return [];
        }
        return data as Tournament[];
    }

    // 2. AUTHENTICATED USER
    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!profile) {
        // Fallback to strict security if profile missing (shouldn't happen)
        return [];
    }

    // Call RPC
    let query = supabase.rpc('get_visible_tournaments', {
        requesting_user_id: user.id,
        requesting_user_pid: profile.pokemon_player_id || '',
        requesting_user_role: profile.role
    });

    if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
    }

    // Order and Pagination
    // Note: RPC returns SETOF tournaments, so we can chain modifiers
    const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error('Error fetching visible tournaments:', error);
        throw new Error(error.message);
    }

    return data as Tournament[];
}
