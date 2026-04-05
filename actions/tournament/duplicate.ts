"use server";

import { createClient } from "@/utils/supabase/server";
import type { TournamentFormDefaults } from "@/lib/tournament-templates";

/**
 * Fetches an existing tournament's settings for duplication.
 * Returns only the template-able fields (strips IDs, status, timestamps, secrets).
 */
export async function getDuplicateDefaults(
    tournamentId: string
): Promise<{ defaults: TournamentFormDefaults & { name: string; date: string }; error?: string } | { error: string }> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
        return { error: "Unauthorized" };
    }

    // Verify the user is organizer/admin
    const { data: profile } = await supabase
        .from('profiles')
        .select('role, pokemon_player_id')
        .eq('id', user.id)
        .single();

    if (!profile || (profile.role !== 'admin' && profile.role !== 'organizer')) {
        return { error: "Only organizers and admins can duplicate tournaments." };
    }

    const { data: tournament, error } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', tournamentId)
        .single();

    if (error || !tournament) {
        return { error: "Tournament not found." };
    }

    // Non-admin must own the tournament
    if (profile.role !== 'admin' && tournament.organizer_popid !== profile.pokemon_player_id) {
        return { error: "You can only duplicate your own tournaments." };
    }

    // Extract start time as HH:mm
    let startTime = "13:00";
    if (tournament.start_time) {
        try {
            const d = new Date(tournament.start_time);
            if (!isNaN(d.getTime())) {
                startTime = d.toTimeString().slice(0, 5);
            }
        } catch { /* use default */ }
    }

    return {
        defaults: {
            name: tournament.name,
            date: tournament.date,
            tournament_mode: tournament.tournament_mode || 'LEAGUECHALLENGE',
            city: tournament.city || '',
            country: tournament.country || '',
            start_time: startTime,
            requires_deck_list: tournament.requires_deck_list || false,
            deck_submission_cutoff_hours: tournament.deck_submission_cutoff_hours || 0,
            registration_open: tournament.registration_open || false,
            publish_roster: tournament.publish_roster ?? true,
            allow_online_match_reporting: tournament.allow_online_match_reporting || false,
            capacity: tournament.capacity || 0,
            capacity_juniors: tournament.capacity_juniors || 0,
            capacity_seniors: tournament.capacity_seniors || 0,
            capacity_masters: tournament.capacity_masters || 0,
            juniors_birth_year_max: tournament.juniors_birth_year_max || null,
            seniors_birth_year_max: tournament.seniors_birth_year_max || null,
            payment_required: tournament.payment_required || false,
            enable_queue: tournament.enable_queue || false,
        },
    };
}
