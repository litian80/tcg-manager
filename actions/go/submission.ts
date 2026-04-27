"use server";

import { createClient } from "@/utils/supabase/server";
import { validateGOTeam } from "@/lib/go/validator";
import { revalidatePath } from "next/cache";
import { tryDispatchNotification } from "@/utils/webhook-helpers";
import type { GOPokemon, GOValidationResult } from "@/lib/go/types";

/**
 * Submit a Pokémon GO team list for a tournament.
 * Mirrors the VGC submission flow in actions/vgc/submission.ts.
 */
export async function submitGOTeamAction(
    tournamentId: string,
    pokemon: GOPokemon[],
    playerInfo: {
        playerName: string;
        inGameNickname: string;
    }
): Promise<GOValidationResult> {
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

    if (tournament.game_type !== 'GO') {
        return {
            isValid: false,
            team: [],
            errors: [{ field: 'tournament', message: 'This tournament is not a Pokémon GO event.' }],
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

    // 3. Validate
    const validationResult = validateGOTeam(pokemon);

    if (!validationResult.isValid) {
        return validationResult;
    }

    // 4. Upsert to go_team_lists
    try {
        const { error: upsertError } = await supabase
            .from('go_team_lists' as any)
            .upsert({
                tournament_id: tournamentId,
                player_id: playerId,
                player_name: playerInfo.playerName,
                in_game_nickname: playerInfo.inGameNickname,
                parsed_team: pokemon,
                validation_status: 'valid',
                validation_errors: [],
                submitted_at: new Date().toISOString(),
            } as any, {
                onConflict: 'tournament_id,player_id',
            });

        if (upsertError) {
            console.error("GO Team List Persistence Error:", upsertError);
            return {
                isValid: false,
                team: pokemon,
                errors: [{ field: 'save', message: 'Failed to save team list.' }],
                warnings: validationResult.warnings,
            };
        }

        revalidatePath(`/tournament/${tournamentId}`);

        // Fire team.submitted webhook (fire-and-forget)
        tryDispatchNotification(supabase, tournamentId, 'team.submitted', playerId)
            .catch(() => {});

        return {
            isValid: true,
            team: pokemon,
            errors: [],
            warnings: validationResult.warnings,
        };

    } catch (err: any) {
        console.error("GO Submission Error:", err);
        return {
            isValid: false,
            team: pokemon,
            errors: [{ field: 'save', message: 'An unexpected error occurred during submission.' }],
            warnings: [],
        };
    }
}
