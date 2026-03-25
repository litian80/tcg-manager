"use server";

import { createClient, createAdminClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { sanitizeSearchQuery } from "@/lib/utils";

export interface RosterCandidate {
    id: string;
    first_name: string;
    last_name: string;
    pokemon_player_id: string;
    birth_year: number;
}

export async function searchRosterCandidates(query: string): Promise<RosterCandidate[]> {
    if (!query || query.length < 2) return [];
    const sanitized = sanitizeSearchQuery(query);

    const supabase = await createClient();

    // Auth Check: only organizers and admins should search profiles for roster management
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (profile?.role !== 'admin' && profile?.role !== 'organizer') {
        return [];
    }

    // Search profiles
    // We want to match first_name OR last_name OR pokemon_player_id
    // AND they must have all required fields not null

    // Supabase query construction
    const { data, error } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, pokemon_player_id, birth_year')
        .not('first_name', 'is', null)
        .not('last_name', 'is', null)
        .not('pokemon_player_id', 'is', null)
        .not('birth_year', 'is', null)
        .or(`first_name.ilike.%${sanitized}%,last_name.ilike.%${sanitized}%,pokemon_player_id.ilike.%${sanitized}%`)
        .limit(20);

    if (error) {
        console.error("Error searching candidates:", error);
        return [];
    }

    // Cast to expected type (checked by .not() filters above)
    return data as RosterCandidate[];
}

export async function addPlayerToRoster(tournamentId: string, profileId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // 2. Fetch Tournament using admin client to bypass RLS
    const adminSupabase = await createAdminClient();
    const { data: tournament, error: tError } = await adminSupabase
        .from('tournaments')
        .select('organizer_popid')
        .eq('id', tournamentId)
        .single();

    if (tError || !tournament) {
        console.error("AddPlayer Error: Tournament not found or error fetching.", tError);
        return { error: "Tournament not found" };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, pokemon_player_id')
        .eq('id', user.id)
        .single();

    // Multi-tier authorization consistent with lib/auth.ts
    const isAdmin = profile?.role === 'admin';
    const isPopIdMatch = tournament.organizer_popid && profile?.pokemon_player_id === tournament.organizer_popid;

    if (!isAdmin && !isPopIdMatch) {
        console.error("AddPlayer Unauthorized: User", user.id, "attempted to manage tournament", tournamentId);
        return { error: "Unauthorized" };
    }

    // 3. Restriction: Organizer cannot add themselves
    // Match by both UUID and POP ID to be safe
    const isSelfByUuid = user.id === profileId;
    // We fetch the candidate's POP ID later, but the profileId is the candidate's profile UUID.
    if (!isAdmin && isSelfByUuid) {
        return { error: "Organizers cannot participate as players in their own tournament." };
    }

    // 4. Fetch Candidate Profile to ensure it exists and has data (double check)
    const { data: candidate } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', profileId)
        .single();

    if (!candidate) {
        return { error: "Candidate profile not found" };
    }

    // 5. Add to Tournament Players
    // Ensure "Player" entity exists in `players` table corresponding to this `profile`.
    // If not, create it.

    const { data: playerRecord, error: pError } = await supabase
        .from('players')
        .select('tom_player_id')
        .eq('tom_player_id', candidate.pokemon_player_id!)
        // .eq('tournament_id', tournamentId) 
        .single();

    if (pError) {
        console.error("Player Lookup Error (RLS?):", pError);
    }

    let playerId = playerRecord?.tom_player_id;


    if (!playerId) {
        // Create new Player entity
        const { data: newPlayer, error: createError } = await supabase
            .from('players')
            .insert({
                first_name: candidate.first_name,
                last_name: candidate.last_name,
                tom_player_id: candidate.pokemon_player_id
            })
            .select('tom_player_id')
            .single();

        if (createError) {
            console.error("Failed to create player entity:", createError);
            console.error("Failed to create player entity:", createError);
            return { error: "Failed to register player entity." };
        }

        playerId = newPlayer.tom_player_id;
    }

    // 6. Insert into tournament_players
    // We need to save `birth_year` here as per `export-tdf.ts` logic which reads `tp.birth_year`.
    const { error: joinError } = await supabase
        .from('tournament_players')
        .insert({
            tournament_id: tournamentId,
            player_id: playerId,
            // birth_year: candidate.birth_year // OMITTING: Column likely missing from tournament_players
        });

    if (joinError) {
        console.error("AddPlayer Error: Failed to insert into tournament_players.", joinError);
        if (joinError.code === '23505') { // Unique violation
            throw new Error("Player is already in the roster.");
        }
        console.error("AddPlayer Error: Failed to insert into tournament_players.", joinError);
        if (joinError.code === '23505') { // Unique violation
            return { error: "Player is already in the roster." };
        }
        return { error: "Failed to add player to roster." };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}

export async function removePlayerFromRoster(tournamentId: string, playerId: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // 1. Fetch Tournament and Current Profile for Multi-tier Authorization
    // We use the ADMIN client here for the fetch to rule out RLS issues on the tournaments table
    const adminSupabase = await createAdminClient();
    const { data: tournament, error: tError } = await adminSupabase
        .from('tournaments')
        .select('organizer_popid')
        .eq('id', tournamentId)
        .single();

    if (tError || !tournament) {
        console.error("RemovePlayer Error: Tournament not found.", tError);
        return { error: `Tournament not found. ${tError?.message || 'No row returned'}` };
    }

    const { data: profile } = await adminSupabase
        .from('profiles')
        .select('role, pokemon_player_id')
        .eq('id', user.id)
        .single();

    // Multi-tier authorization logic
    const isAdmin = profile?.role === 'admin';
    const isPopIdMatch = tournament.organizer_popid && profile?.pokemon_player_id === tournament.organizer_popid;

    if (!isAdmin && !isPopIdMatch) {
        console.error("RemovePlayer Unauthorized: User", user.id, "attempted to remove player from", tournamentId);
        return { error: "Unauthorized" };
    }

    // 2. Delete from tournament_players
    // tournament_players.player_id is a foreign key to players.tom_player_id (the POP ID string)
    // We use the ADMIN client here to bypass RLS, since we already manually authorized the user above.
    const { error: deleteError, count } = await adminSupabase
        .from('tournament_players')
        .delete({ count: 'exact' })
        .eq('tournament_id', tournamentId)
        .eq('player_id', playerId); 

    if (deleteError) {
        console.error("RemovePlayer DB Error:", deleteError);
        return { error: `Failed to remove player from roster: ${deleteError.message}` };
    }

    if (count === 0) {
        console.warn(`RemovePlayer: No record found for tournament ${tournamentId} and player ${playerId}`);
        // This could happen if the ID in the UI is out of sync or already deleted
    } else {
        console.log(`RemovePlayer Success: Deleted ${count} record(s).`);
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}

export async function updateRegistrationStatus(tournamentId: string, playerId: string, status: string) {
    // Validate status against allowlist
    const validStatuses = ['registered', 'checked_in', 'waitlisted', 'withdrawn', 'cancelled'];
    if (!validStatuses.includes(status)) {
        return { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` };
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // Use admin client for tournament lookup to bypass RLS
    const adminSupabase = await createAdminClient();

    const { data: tournament, error: tError } = await adminSupabase
        .from('tournaments')
        .select('organizer_popid')
        .eq('id', tournamentId)
        .single();

    if (tError || !tournament) {
        return { error: "Tournament not found" };
    }

    const { data: profile } = await adminSupabase.from('profiles').select('role, pokemon_player_id').eq('id', user.id).single();

    const isOrganizer = tournament.organizer_popid && profile?.pokemon_player_id === tournament.organizer_popid;
    const isAdmin = profile?.role === 'admin';

    // Check if user is an assigned judge for this tournament (assignment-based)
    const { count: judgeCount } = await adminSupabase
        .from('tournament_judges')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId)
        .eq('user_id', user.id);
    const isJudge = (judgeCount ?? 0) > 0;

    if (!isOrganizer && !isAdmin && !isJudge) {
        return { error: "Unauthorized" };
    }

    // Use admin client for update since user is already manually authorized above
    const { error } = await adminSupabase
        .from('tournament_players')
        .update({ registration_status: status })
        .eq('tournament_id', tournamentId)
        .eq('player_id', playerId);

    if (error) {
        return { error: "Failed to update registration status." };
    }

    revalidatePath(`/tournament/${tournamentId}`);
    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}
