"use server";

import { createClient } from "@/utils/supabase/server";
import { parseDeckList, normalizeCardName } from "@/utils/deck-validator";
import type { DeckParseResult } from "@/types/deck";

export interface ValidationResult {
    isValid: boolean;
    errors: string[];
    warnings: string[];
    isPartial?: boolean;
    parsedDeck?: DeckParseResult;
    cardDetails: {
        card_id: string;
        quantity: number;
        name: string;
        set: string;
        number: string;
    }[];
}

export async function validateDeckListAction(deckText: string, tournamentId?: string): Promise<ValidationResult> {
    const supabase = await createClient();
    const result: ValidationResult = {
        isValid: true,
        errors: [],
        warnings: [],
        cardDetails: [],
    };

    try {
        const parsed = parseDeckList(deckText);
        result.parsedDeck = parsed;

        if (parsed.Errors.length > 0) {
            result.isValid = false;
            result.errors.push(...parsed.Errors.map(e => `Malformed List: ${e.message} at "${e.line}"`));
            return result;
        }

        const allParsedCards = [...parsed.Pokemon, ...parsed.Trainer, ...parsed.Energy];
        
        // Hardcoded to Pokemon TCG standard format (60-card deck)
        const expectedDeckSize = 60;

        if (parsed.TotalCards !== expectedDeckSize) {
            result.isValid = false;
            if (parsed.TotalCards < expectedDeckSize) {
                result.isPartial = true;
                result.errors.push(`Partial Deck: Only ${parsed.TotalCards}/${expectedDeckSize} cards found.`);
            } else {
                result.errors.push(`Invalid Deck: ${parsed.TotalCards} cards found (limit is ${expectedDeckSize}).`);
            }
        }

        if (allParsedCards.length === 0) {
            result.isValid = false;
            result.errors.push("Deck list is empty.");
            return result;
        }

        // Separate cards by category for different validation approaches
        const pokemonCards = allParsedCards.filter(c => c.category === 'pokemon');
        const trainerCards = allParsedCards.filter(c => c.category === 'trainer');
        const energyCards = allParsedCards.filter(c => c.category === 'energy');

        // Arrays to collect validation results
        const validatedCards: Array<{
            parsed: any;
            dbCard: any;
            setId?: string;
            setCode?: string;
        }> = [];

        const validationErrors: string[] = [];

        // Step 1: Validate Pokémon cards (by set/number)
        const pokemonCardsToValidate = pokemonCards.filter(c => {
            const hasValidSet = c.set && /^[A-Za-z0-9]+$/.test(c.set);
            const hasValidNumber = c.number && /^[A-Za-z0-9]+$/.test(c.number);
            if (!hasValidSet || !hasValidNumber) {
                validationErrors.push(`Unrecognised Pokémon card reference: "${c.name}" (set: ${c.set || "missing"}, number: ${c.number || "missing"})`);
                return false;
            }
            return true;
        });

        if (pokemonCardsToValidate.length > 0) {
            // Resolve set codes to IDs for Pokémon
            const uniqueSetCodes = Array.from(new Set(pokemonCardsToValidate.map(c => c.set)));
            const { data: setData, error: setError } = await supabase
                .from('sets')
                .select('id, code')
                .in('code', uniqueSetCodes);

            if (setError) {
                console.error("Set Lookup Error:", setError);
                validationErrors.push("Failed to verify tournament sets in our database (Server Error).");
            } else {
                const setMap = new Map<string, string>();
                const idToCodeMap = new Map<string, string>();
                setData?.forEach(s => {
                    setMap.set(s.code, s.id);
                    idToCodeMap.set(s.id, s.code);
                });

                // Check for missing sets
                const missingSets = uniqueSetCodes.filter(code => !setMap.has(code));
                missingSets.forEach(code => {
                    validationErrors.push(`Set code "${code}" not found in our database.`);
                });

                // Batch lookup valid cards
                const validPokemonCards = pokemonCardsToValidate.filter(c => setMap.has(c.set));
                const dbFilters: string[] = [];

                for (const card of validPokemonCards) {
                    const setId = setMap.get(card.set)!;
                    const numericValue = parseInt(card.number, 10);
                    
                    if (isNaN(numericValue)) {
                        validationErrors.push(`Non-numeric card number "${card.number}" for "${card.name}" is not supported.`);
                        continue;
                    }
                    dbFilters.push(`and(set_id.eq.${setId},card_number.eq.${numericValue})`);
                }

                if (dbFilters.length > 0) {
                    const { data: dbCards, error: cardError } = await supabase
                        .from('cards')
                        .select(`
                            id, 
                            name, 
                            card_number,
                            set_id,
                            primary_category,
                            equivalency_members(group_id)
                        `)
                        .or(dbFilters.join(','));

                    if (cardError) {
                        console.error("Card Lookup Error:", cardError);
                        validationErrors.push("Failed to verify Pokémon cards against database.");
                    } else {
                        // Map results back to parsed cards
                        const cardMap = new Map<string, any>();
                        for (const dbCard of dbCards || []) {
                            const code = idToCodeMap.get(dbCard.set_id) || 'unknown';
                            const key = `${code}-${dbCard.card_number}`;
                            cardMap.set(key, dbCard);
                        }

                        for (const parsedCard of validPokemonCards) {
                            const key = `${parsedCard.set}-${parsedCard.number}`;
                            const dbCard = cardMap.get(key);

                            if (!dbCard) {
                                validationErrors.push(`Card not found: ${parsedCard.name} (${parsedCard.set} ${parsedCard.number})`);
                                continue;
                            }

                            validatedCards.push({
                                parsed: parsedCard,
                                dbCard,
                                setId: dbCard.set_id,
                                setCode: parsedCard.set
                            });
                        }
                    }
                }
            }
        }

        // Step 2 & 3: Validate name-only cards (Trainers and Energy)
        const nameOnlyCards = [...trainerCards, ...energyCards];
        if (nameOnlyCards.length > 0) {
            const uniqueNames = Array.from(new Set(nameOnlyCards.map(c => normalizeCardName(c.name))));

            const { data: dbCards, error: dbError } = await supabase
                .from('cards')
                .select(`
                    id, 
                    name, 
                    primary_category,
                    equivalency_members(group_id)
                `)
                .or(uniqueNames.map(name => `name.ilike."${name.replace(/"/g, '""')}"`).join(','));

            if (dbError) {
                console.error("Name-only Lookup Error:", dbError);
                validationErrors.push("Failed to verify Trainer/Energy cards against database.");
            } else {
                const cardLookupMap = new Map<string, any>();
                for (const dbCard of dbCards || []) {
                    // Normalize DB names for lookup map just in case there are variations in the DB
                    cardLookupMap.set(normalizeCardName(dbCard.name).toLowerCase(), dbCard);
                }

                for (const parsedCard of nameOnlyCards) {
                    const dbCard = cardLookupMap.get(normalizeCardName(parsedCard.name).toLowerCase());

                    if (!dbCard) {
                        validationErrors.push(`Card not found: "${parsedCard.name}"`);
                        continue;
                    }

                    // Source of truth: Use the DB's primary_category for the validated card
                    validatedCards.push({
                        parsed: {
                            ...parsedCard,
                            // Ensure basic energy detection uses DB category
                            isBasicEnergy: dbCard.primary_category === 'Energy' && !parsedCard.name.toLowerCase().includes("special")
                        },
                        dbCard,
                        setCode: "N/A"
                    });
                }
            }
        }

        // Update validation result with any errors
        if (validationErrors.length > 0) {
            result.isValid = false;
            result.errors.push(...validationErrors);
        }

        // If no cards validated successfully, return early
        if (validatedCards.length === 0 && allParsedCards.length > 0) {
            result.isValid = false;
            result.errors.push("No valid cards found in database.");
            return result;
        }

        // Build cardDetails for submission
        const groupCounts = new Map<string, number>();
        let radiantCount = 0;
        let aceSpecCount = 0;

        for (const validated of validatedCards) {
            const { parsed, dbCard, setCode } = validated;
            const isBasicEnergy = parsed.isBasicEnergy || false;

            // Populate cardDetails
            result.cardDetails.push({
                card_id: dbCard.id,
                quantity: parsed.qty,
                name: dbCard.name,
                set: setCode || 'unknown',
                number: dbCard.card_number || '0'
            });

            // Rule logic
            const lowName = dbCard.name.toLowerCase();

            // Radiant detection
            if (lowName.startsWith("radiant ")) {
                radiantCount += parsed.qty;
            }

            // ACE SPEC detection
            if (lowName.includes("ace spec") || 
                ["prime catcher", "master ball", "computer search", "dowsing machine", 
                 "maximum belt", "life dew", "gold potion"].some(name => lowName.includes(name))) {
                aceSpecCount += parsed.qty;
            }

            // 4-of rule logic (skip for basic energy)
            if (!isBasicEnergy) {
                const groupId = dbCard.equivalency_members?.[0]?.group_id;
                const countKey = groupId ? `group:${groupId}` : `name:${lowName}`;
                
                const currentCount = groupCounts.get(countKey) || 0;
                groupCounts.set(countKey, currentCount + parsed.qty);
            }
        }

        // Rule Enforcements
        if (radiantCount > 1) {
            result.errors.push(`Deck can only contain 1 Radiant Pokémon (found ${radiantCount}).`);
            result.isValid = false;
        }
        if (aceSpecCount > 1) {
            result.errors.push(`Deck can only contain 1 ACE SPEC card (found ${aceSpecCount}).`);
            result.isValid = false;
        }

        for (const [key, count] of groupCounts.entries()) {
            if (count > 4) {
                const identifier = key.startsWith('group:') ? "Equivalent set of cards" : `Card "${key.split(':')[1]}"`;
                result.errors.push(`${identifier} exceeds the 4-copy limit (found ${count}).`);
                result.isValid = false;
            }
        }

        return result;

    } catch (e: any) {
        console.error("Validation Action Error:", e);
        result.isValid = false;
        result.errors.push("An unexpected error occurred during validation.");
        return result;
    }
}
