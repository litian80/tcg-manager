"use server";

import { createClient } from "@/utils/supabase/server";
import { validateDeckListAction, ValidationResult } from "./deck-validation";
import { revalidatePath } from "next/cache";

export async function submitDeckAction(tournamentId: string, deckText: string): Promise<ValidationResult> {
    const supabase = await createClient();
    
    // 1. Auth & Profile Check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { 
            isValid: false, 
            errors: ["Not authenticated"], 
            warnings: [], 
            cardDetails: [] 
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
            errors: ["Profile missing POP ID. Please update your profile first."], 
            warnings: [], 
            cardDetails: [] 
        };
    }

    const playerId = profile.pokemon_player_id;

    // 2. Check tournament and registration
    const { data: tournament, error: tournamentError } = await supabase
        .from('tournaments')
        .select('requires_deck_list, deck_list_submission_deadline')
        .eq('id', tournamentId)
        .single();

    if (tournamentError || !tournament) {
        return { 
            isValid: false, 
            errors: ["Tournament not found."], 
            warnings: [], 
            cardDetails: [] 
        };
    }

    if (!tournament.requires_deck_list) {
        return { 
            isValid: false, 
            errors: ["This tournament does not require a deck list."], 
            warnings: [], 
            cardDetails: [] 
        };
    }

    if (tournament.deck_list_submission_deadline && new Date(tournament.deck_list_submission_deadline) < new Date()) {
        return { 
            isValid: false, 
            errors: ["The deck list submission deadline has passed."], 
            warnings: [], 
            cardDetails: [] 
        };
    }

    // Check if the player is registered for the tournament
    const { data: registration, error: registrationError } = await supabase
        .from('tournament_players')
        .select('player_id')
        .eq('tournament_id', tournamentId)
        .eq('player_id', playerId)
        .single();

    if (registrationError || !registration) {
        return { 
            isValid: false, 
            errors: ["You are not registered for this tournament."], 
            warnings: [], 
            cardDetails: [] 
        };
    }

    // 3. Validate the deck list text
    const validation = await validateDeckListAction(deckText, tournamentId);
    if (!validation.isValid) {
        return validation;
    }

    try {
        // 3. Save to deck_lists (Upsert)
        const { data: deckList, error: deckListError } = await supabase
            .from('deck_lists')
            .upsert({
                tournament_id: tournamentId,
                player_id: playerId,
                raw_text: deckText,
                validation_status: 'valid',
                submitted_at: new Date().toISOString()
            }, {
                onConflict: 'tournament_id,player_id'
            })
            .select()
            .single();

        if (deckListError) {
            console.error("Deck List Persistence Error:", deckListError);
            return { 
                isValid: false, 
                errors: ["Failed to save deck list."], 
                warnings: validation.warnings, 
                cardDetails: validation.cardDetails 
            };
        }

        // 4. Save to deck_list_cards
        // First, clear existing cards for this deck list to avoid duplicates/conflicts on quantity changes
        await supabase
            .from('deck_list_cards')
            .delete()
            .eq('deck_list_id', deckList.id);

        // Prepare card entries from validation details
        const entries = validation.cardDetails.map(cd => ({
            deck_list_id: deckList.id,
            card_id: cd.card_id,
            quantity: cd.quantity,
            category: 'main' // default to main
        }));

        if (entries.length > 0) {
            const { error: cardsError } = await supabase
                .from('deck_list_cards')
                .insert(entries);
            
            if (cardsError) {
                console.error("Deck List Cards Persistence Error:", cardsError);
                // We should ideally mark the deck_list as invalid or pending if cards fail
                await supabase.from('deck_lists').update({ validation_status: 'invalid' }).eq('id', deckList.id);
                return { 
                    isValid: false, 
                    errors: ["Failed to save deck contents."], 
                    warnings: validation.warnings, 
                    cardDetails: validation.cardDetails 
                };
            }
        }

        revalidatePath(`/tournament/${tournamentId}`);
        return { ...validation, isValid: true };

    } catch (err: any) {
        console.error("Submission Error:", err);
        return { 
            isValid: false, 
            errors: ["An unexpected error occurred during submission."], 
            warnings: validation?.warnings || [], 
            cardDetails: validation?.cardDetails || [] 
        };
    }
}
