"use server";

import { createClient } from "@/utils/supabase/server";
import { parseShowdownPaste } from "@/lib/vgc/parser";
import { validateTeam } from "@/lib/vgc/validator";
import { revalidatePath } from "next/cache";
import { tryDispatchNotification } from "@/utils/webhook-helpers";
import type { VGCValidationResult } from "@/lib/vgc/types";

/**
 * FEAT-010: Submit a VGC team list for a tournament.
 * Mirrors the deck submission flow in actions/deck/submission.ts.
 */
export async function submitVGCTeamAction(
    tournamentId: string,
    pasteText: string
): Promise<VGCValidationResult> {
    const supabase = await createClient();

    // 1. Auth & Profile Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return {
            isValid: false,
            team: [],
            errors: [{ field: 'auth', message: 'Not authenticated.' }],
            warnings: [],
        };
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('pokemon_player_id')
        .eq('id', user.id)
        .single();

    if (!profile?.pokemon_player_id) {
        return {
            isValid: false,
            team: [],
            errors: [{ field: 'profile', message: 'Profile missing POP ID. Please update your profile first.' }],
            warnings: [],
        };
    }

    const playerId = profile.pokemon_player_id;

    // 2. Tournament checks
    const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('requires_deck_list, deck_list_submission_deadline, game_type')
        .eq('id', tournamentId)
        .single();

    if (tournamentError || !tournament) {
        return {
            isValid: false,
            team: [],
            errors: [{ field: 'tournament', message: 'Tournament not found.' }],
            warnings: [],
        };
    }

    if (tournament.game_type !== 'VIDEO_GAME') {
        return {
            isValid: false,
            team: [],
            errors: [{ field: 'tournament', message: 'This tournament is not a VGC event.' }],
            warnings: [],
        };
    }

    if (!tournament.requires_deck_list) {
        return {
            isValid: false,
            team: [],
            errors: [{ field: 'tournament', message: 'This tournament does not require a team list.' }],
            warnings: [],
        };
    }

    // Check if tournament has started
    const { count: matchesCount } = await supabase
        .from('matches')
        .select('*', { count: 'exact', head: true })
        .eq('tournament_id', tournamentId);

    if (matchesCount && matchesCount > 0) {
        return {
            isValid: false,
            team: [],
            errors: [{ field: 'tournament', message: 'The tournament has already started. Team list submission is now closed.' }],
            warnings: [],
        };
    }

    // Deadline check
    if (tournament.deck_list_submission_deadline && new Date(tournament.deck_list_submission_deadline) < new Date()) {
        return {
            isValid: false,
            team: [],
            errors: [{ field: 'deadline', message: 'The team list submission deadline has passed.' }],
            warnings: [],
        };
    }

    // Registration check
    const { data: registration, error: registrationError } = await supabase
        .from('tournament_players')
        .select('player_id')
        .eq('tournament_id', tournamentId)
        .eq('player_id', playerId)
        .single();

    if (registrationError || !registration) {
        return {
            isValid: false,
            team: [],
            errors: [{ field: 'registration', message: 'You are not registered for this tournament.' }],
            warnings: [],
        };
    }

    // 3. Parse & Validate
    const parseResult = parseShowdownPaste(pasteText);

    if (parseResult.errors.length > 0) {
        return {
            isValid: false,
            team: parseResult.pokemon,
            errors: parseResult.errors,
            warnings: parseResult.warnings,
        };
    }

    const validationResult = validateTeam(parseResult.pokemon);

    if (validationResult.errors.length > 0) {
        return {
            isValid: false,
            team: parseResult.pokemon,
            errors: validationResult.errors,
            warnings: [...parseResult.warnings, ...validationResult.warnings],
        };
    }

    // 4. Upsert to vgc_team_lists
    try {
        const { error: upsertError } = await supabase
            .from('vgc_team_lists')
            .upsert({
                tournament_id: tournamentId,
                player_id: playerId,
                raw_paste: pasteText,
                parsed_team: parseResult.pokemon,
                validation_status: 'valid',
                validation_errors: [],
                submitted_at: new Date().toISOString(),
            }, {
                onConflict: 'tournament_id,player_id',
            });

        if (upsertError) {
            console.error("VGC Team List Persistence Error:", upsertError);
            return {
                isValid: false,
                team: parseResult.pokemon,
                errors: [{ field: 'save', message: 'Failed to save team list.' }],
                warnings: parseResult.warnings,
            };
        }

        revalidatePath(`/tournament/${tournamentId}`);

        // Fire team.submitted webhook (fire-and-forget)
        tryDispatchNotification(supabase, tournamentId, 'team.submitted', playerId)
            .catch(() => {});

        return {
            isValid: true,
            team: parseResult.pokemon,
            errors: [],
            warnings: [...parseResult.warnings, ...validationResult.warnings],
        };

    } catch (err: any) {
        console.error("VGC Submission Error:", err);
        return {
            isValid: false,
            team: parseResult.pokemon,
            errors: [{ field: 'save', message: 'An unexpected error occurred during submission.' }],
            warnings: [],
        };
    }
}
