'use server'

import { createClient } from "@/utils/supabase/server";
import { Database } from "@/utils/supabase/database.types";
import { sanitizeSearchQuery } from "@/lib/utils";

import { Tournament } from "@/types";

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
            .or('is_published.eq.true,registration_open.eq.true')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (searchQuery) {
            query = query.ilike('name', `%${sanitizeSearchQuery(searchQuery)}%`);
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
        query = query.ilike('name', `%${sanitizeSearchQuery(searchQuery)}%`);
    }

    // Order and Pagination
    // Note: RPC returns SETOF tournaments, so we can chain modifiers
    const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);


    if (error) {
        console.error('Error fetching visible tournaments:', error);
        return { error: error.message };
    }

    return { success: data as Tournament[] };
}

export async function getPublicTournaments({
    limit = 20,
    offset = 0,
    searchQuery = '',
    statusFilter = 'all'
}: GetTournamentsParams & { statusFilter?: 'upcoming' | 'past' | 'all' } = {}) {
    const supabase = await createClient();
    let query = supabase
        .from('tournaments')
        .select('*')
        .or('is_published.eq.true,registration_open.eq.true');

    const todayDateOnly = new Date().toISOString().split('T')[0];

    if (statusFilter === 'upcoming') {
        query = query.gte('date', todayDateOnly);
    } else if (statusFilter === 'past') {
        query = query.lt('date', todayDateOnly);
    }

    if (searchQuery) {
        query = query.ilike('name', `%${sanitizeSearchQuery(searchQuery)}%`);
    }

    const { data, error } = await query
        .order('date', { ascending: statusFilter === 'upcoming' }) 
        .range(offset, offset + limit - 1);

    if (error) {
        console.error('Error fetching public tournaments:', error);
        return { error: error.message };
    }
    return { success: data as Tournament[] };
}

export async function getOrganizerTournaments({
    limit = 20,
    offset = 0,
    searchQuery = ''
}: GetTournamentsParams = {}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'organizer' || !profile.pokemon_player_id) {
        return { error: 'Not authorized or missing POP ID' };
    }

    let query = supabase
        .from('tournaments')
        .select('*')
        .eq('organizer_popid', profile.pokemon_player_id);

    if (searchQuery) {
        query = query.ilike('name', `%${sanitizeSearchQuery(searchQuery)}%`);
    }

    const { data, error } = await query
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error('Error fetching organizer tournaments:', error);
        return { error: error.message };
    }
    return { success: data as Tournament[] };
}

export async function getJudgeAssignedTournaments({
    limit = 20,
    offset = 0,
    searchQuery = ''
}: GetTournamentsParams = {}) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    // Fetch tournament IDs this judge is assigned to
    const { data: judgeAssignments, error: assignError } = await supabase
        .from('tournament_judges')
        .select('tournament_id')
        .eq('user_id', user.id);

    if (assignError) {
        console.error('Error fetching judge assignments:', assignError);
        return { error: assignError.message };
    }

    if (!judgeAssignments || judgeAssignments.length === 0) {
        return { success: [] as Tournament[] };
    }

    const tournamentIds = judgeAssignments.map(j => j.tournament_id);

    let query = supabase
        .from('tournaments')
        .select('*')
        .in('id', tournamentIds);

    if (searchQuery) {
        query = query.ilike('name', `%${sanitizeSearchQuery(searchQuery)}%`);
    }

    const { data, error } = await query
        .order('date', { ascending: false })
        .range(offset, offset + limit - 1);

    if (error) {
        console.error('Error fetching judge tournaments:', error);
        return { error: error.message };
    }
    return { success: data as Tournament[] };
}
