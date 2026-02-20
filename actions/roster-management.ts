"use server";

import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";

export interface RosterCandidate {
    id: string;
    first_name: string;
    last_name: string;
    pokemon_player_id: string;
    birth_year: number;
}

export async function searchRosterCandidates(query: string): Promise<RosterCandidate[]> {
    if (!query || query.length < 2) return [];

    const supabase = await createClient();

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
        .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,pokemon_player_id.ilike.%${query}%`)
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

    // 1. Fetch Tournament to check Organizer
    const { data: tournament, error: tError } = await supabase
        .from('tournaments')
        .select('organizer_id, organizer_popid')
        .eq('id', tournamentId)
        .single();

    if (tError || !tournament) {
        console.error("AddPlayer Error: Tournament not found. ID:", tournamentId, "Supabase Error:", tError);
        console.error("AddPlayer Error: Tournament not found. ID:", tournamentId, "Supabase Error:", tError);
        return { error: "Tournament not found" };
    }

    // 2. Fetch Current User Role
    const { data: currentUserProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    // Check if the current user is the organizer (UUID check)
    const isOrganizer = tournament.organizer_id === user.id;
    const isAdmin = currentUserProfile?.role === 'admin';

    if (!isOrganizer && !isAdmin) {
        return { error: "Unauthorized" };
    }

    // 3. Check Restriction: Organizer cannot add themselves
    if (isOrganizer && !isAdmin && user.id === profileId) {
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
                tom_player_id: candidate.pokemon_player_id,
                tournament_id: tournamentId // Required by DB schema
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

    // 1. Fetch Tournament to check Organizer
    const { data: tournament, error: tError } = await supabase
        .from('tournaments')
        .select('organizer_id')
        .eq('id', tournamentId)
        .single();

    if (tError || !tournament) {
        return { error: "Tournament not found" };
    }

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();

    // Check if the current user is the organizer (UUID check)
    const isOrganizer = tournament.organizer_id === user.id;
    const isAdmin = profile?.role === 'admin';

    if (!isOrganizer && !isAdmin) {
        return { error: "Unauthorized" };
    }

    // 2. Delete from tournament_players
    // We expect playerId to be the `player_id` (UUID of the player entity), not the Profile ID.
    // The UI should pass the `player_id`.

    const { error } = await supabase
        .from('tournament_players')
        .delete()
        .eq('tournament_id', tournamentId)
        .eq('player_id', playerId); // playerId here MUST be the tom_player_id (POP ID) based on the schema discovery.

    if (error) {
        return { error: "Failed to remove player." };
    }

    revalidatePath(`/organizer/tournaments/${tournamentId}`);
    return { success: true };
}
