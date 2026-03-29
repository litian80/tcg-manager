"use server";

import { createClient } from "@/utils/supabase/server";
import { createAdminClient } from "@/utils/supabase/admin";
import { revalidatePath } from "next/cache";

/**
 * Mark a player as having submitted a paper decklist.
 * Only callable by admin, tournament organizer, or assigned judge.
 * Records accountability metadata (who accepted it and when).
 */
export async function markPaperDecklist(
    tournamentId: string,
    playerId: string
): Promise<{ error?: string }> {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // 1. Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: "Not authenticated" };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, pokemon_player_id, first_name, last_name')
        .eq('id', user.id)
        .single();

    if (!profile) {
        return { error: "Profile not found" };
    }

    // 2. Authorization: Must be admin, organizer of this tournament, or assigned judge
    let isAuthorized = false;

    if (profile.role === 'admin') {
        isAuthorized = true;
    } else {
        // Check if organizer
        const { data: tournament } = await supabase
            .from('tournaments')
            .select('organizer_popid')
            .eq('id', tournamentId)
            .single();

        if (tournament?.organizer_popid && profile.pokemon_player_id === tournament.organizer_popid) {
            isAuthorized = true;
        }

        // Check if assigned judge
        if (!isAuthorized) {
            const { count } = await supabase
                .from('tournament_judges')
                .select('*', { count: 'exact', head: true })
                .eq('tournament_id', tournamentId)
                .eq('user_id', user.id);
            if (count && count > 0) {
                isAuthorized = true;
            }
        }
    }

    if (!isAuthorized) {
        return { error: "You are not authorized to manage decklists for this tournament." };
    }

    // 3. Check if an online decklist already exists
    const { data: existingDeck } = await adminClient
        .from('deck_lists')
        .select('id, raw_text')
        .eq('tournament_id', tournamentId)
        .eq('player_id', playerId)
        .maybeSingle();

    if (existingDeck) {
        if (existingDeck.raw_text !== '[PAPER DECKLIST]') {
            return { error: "This player already has an online decklist submitted." };
        }
        // Already marked as paper — idempotent, do nothing
        return {};
    }

    // 4. Insert paper decklist record with accountability metadata
    const acceptedByName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.role || 'Unknown';

    // Must use adminClient because RLS on deck_lists only allows players to insert their own deck (auth.uid() = player_id)
    const { error: insertError } = await adminClient
        .from('deck_lists')
        .insert({
            tournament_id: tournamentId,
            player_id: playerId,
            raw_text: '[PAPER DECKLIST]',
            validation_status: 'valid',
            validation_errors: {
                accepted_by_user_id: user.id,
                accepted_by_name: acceptedByName,
                accepted_at: new Date().toISOString()
            },
            submitted_at: new Date().toISOString()
        });

    if (insertError) {
        console.error("Error marking paper decklist:", insertError);
        return { error: "Failed to mark paper decklist." };
    }

    revalidatePath(`/tournament/${tournamentId}`);
    return {};
}

/**
 * Remove a paper decklist mark.
 * Cannot remove online submissions — only paper marks.
 */
export async function unmarkPaperDecklist(
    tournamentId: string,
    playerId: string
): Promise<{ error?: string }> {
    const supabase = await createClient();

    // 1. Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: "Not authenticated" };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role, pokemon_player_id')
        .eq('id', user.id)
        .single();

    if (!profile) {
        return { error: "Profile not found" };
    }

    // 2. Authorization (same check as markPaperDecklist)
    let isAuthorized = false;

    if (profile.role === 'admin') {
        isAuthorized = true;
    } else {
        const { data: tournament } = await supabase
            .from('tournaments')
            .select('organizer_popid')
            .eq('id', tournamentId)
            .single();

        if (tournament?.organizer_popid && profile.pokemon_player_id === tournament.organizer_popid) {
            isAuthorized = true;
        }

        if (!isAuthorized) {
            const { count } = await supabase
                .from('tournament_judges')
                .select('*', { count: 'exact', head: true })
                .eq('tournament_id', tournamentId)
                .eq('user_id', user.id);
            if (count && count > 0) {
                isAuthorized = true;
            }
        }
    }

    if (!isAuthorized) {
        return { error: "You are not authorized to manage decklists for this tournament." };
    }

    const adminClient = createAdminClient();
    
    // 3. Only delete if it's a paper submission
    const { data: existingDeck } = await adminClient
        .from('deck_lists')
        .select('id, raw_text')
        .eq('tournament_id', tournamentId)
        .eq('player_id', playerId)
        .maybeSingle();

    if (!existingDeck) {
        return { error: "No decklist found for this player." };
    }

    if (existingDeck.raw_text !== '[PAPER DECKLIST]') {
        return { error: "Cannot remove an online decklist submission." };
    }

    const { error: deleteError } = await adminClient
        .from('deck_lists')
        .delete()
        .eq('id', existingDeck.id);

    if (deleteError) {
        console.error("Error unmarking paper decklist:", deleteError);
        return { error: "Failed to remove paper decklist mark." };
    }

    revalidatePath(`/tournament/${tournamentId}`);
    return {};
}
