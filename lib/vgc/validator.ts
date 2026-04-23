/**
 * FEAT-010: VGC Team List Validator
 * Validates parsed VGC teams against static Pokémon data.
 * Phase 1: Existence checks only (no learnset/regulation validation).
 */

import { VGCPokemon, VGCParseError, StatBlock } from './types';
import speciesData from './data/species.json';
import movesData from './data/moves.json';
import abilitiesData from './data/abilities.json';
import itemsData from './data/items.json';
import naturesData from './data/natures.json';

// Build case-insensitive lookup sets for O(1) validation
const SPECIES_SET = new Set((speciesData as string[]).map(s => s.toLowerCase()));
const MOVES_SET = new Set((movesData as string[]).map(s => s.toLowerCase()));
const ABILITIES_SET = new Set((abilitiesData as string[]).map(s => s.toLowerCase()));
const ITEMS_SET = new Set((itemsData as string[]).map(s => s.toLowerCase()));
const NATURES_SET = new Set((naturesData as string[]).map(s => s.toLowerCase()));

const TERA_TYPES = new Set([
    'normal', 'fire', 'water', 'electric', 'grass', 'ice',
    'fighting', 'poison', 'ground', 'flying', 'psychic', 'bug',
    'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy', 'stellar',
]);

/**
 * Validate a parsed VGC team.
 * Returns errors (must fix) and warnings (informational).
 */
export function validateTeam(pokemon: VGCPokemon[]): { errors: VGCParseError[]; warnings: string[] } {
    const errors: VGCParseError[] = [];
    const warnings: string[] = [];

    // Team-level checks
    if (pokemon.length === 0) {
        errors.push({ field: 'team', message: 'Team is empty.' });
        return { errors, warnings };
    }

    if (pokemon.length > 6) {
        errors.push({ field: 'team', message: `Too many Pokémon (${pokemon.length}). Maximum is 6.` });
    }

    // Species clause: no duplicate species
    const speciesSeen = new Set<string>();
    for (let i = 0; i < pokemon.length; i++) {
        const key = pokemon[i].species.toLowerCase();
        if (speciesSeen.has(key)) {
            errors.push({ pokemonIndex: i, field: 'species', message: `Duplicate species: ${pokemon[i].species}. Species Clause violated.` });
        }
        speciesSeen.add(key);
    }

    // Item clause: no duplicate items (only if both Pokémon have items)
    const itemsSeen = new Map<string, number>();
    for (let i = 0; i < pokemon.length; i++) {
        if (pokemon[i].item) {
            const key = pokemon[i].item!.toLowerCase();
            if (itemsSeen.has(key)) {
                const firstIdx = itemsSeen.get(key)!;
                errors.push({
                    pokemonIndex: i,
                    field: 'item',
                    message: `Duplicate item: ${pokemon[i].item}. Item Clause violated (also on Pokémon #${firstIdx + 1}).`,
                });
            } else {
                itemsSeen.set(key, i);
            }
        }
    }

    // Per-Pokémon validation
    for (let i = 0; i < pokemon.length; i++) {
        validatePokemon(pokemon[i], i, errors, warnings);
    }

    return { errors, warnings };
}

function validatePokemon(poke: VGCPokemon, index: number, errors: VGCParseError[], warnings: string[]): void {
    const label = poke.species || `Pokémon #${index + 1}`;

    // Species existence
    if (poke.species && !SPECIES_SET.has(poke.species.toLowerCase())) {
        errors.push({ pokemonIndex: index, field: 'species', message: `Unknown species: "${poke.species}".` });
    }

    // Ability existence
    if (poke.ability && !ABILITIES_SET.has(poke.ability.toLowerCase())) {
        errors.push({ pokemonIndex: index, field: 'ability', message: `${label}: Unknown ability "${poke.ability}".` });
    }

    // Item existence
    if (poke.item && !ITEMS_SET.has(poke.item.toLowerCase())) {
        errors.push({ pokemonIndex: index, field: 'item', message: `${label}: Unknown item "${poke.item}".` });
    }

    // Move existence
    for (const move of poke.moves) {
        if (!MOVES_SET.has(move.toLowerCase())) {
            errors.push({ pokemonIndex: index, field: 'moves', message: `${label}: Unknown move "${move}".` });
        }
    }

    // Move count
    if (poke.moves.length === 0) {
        errors.push({ pokemonIndex: index, field: 'moves', message: `${label}: No moves specified.` });
    } else if (poke.moves.length > 4) {
        errors.push({ pokemonIndex: index, field: 'moves', message: `${label}: Too many moves (${poke.moves.length}). Max 4.` });
    }

    // Duplicate moves
    const moveSet = new Set<string>();
    for (const move of poke.moves) {
        const key = move.toLowerCase();
        if (moveSet.has(key)) {
            errors.push({ pokemonIndex: index, field: 'moves', message: `${label}: Duplicate move "${move}".` });
        }
        moveSet.add(key);
    }

    // Nature existence
    if (poke.nature && !NATURES_SET.has(poke.nature.toLowerCase())) {
        errors.push({ pokemonIndex: index, field: 'nature', message: `${label}: Unknown nature "${poke.nature}".` });
    }

    // Tera Type
    if (poke.teraType && !TERA_TYPES.has(poke.teraType.toLowerCase())) {
        errors.push({ pokemonIndex: index, field: 'teraType', message: `${label}: Unknown Tera Type "${poke.teraType}".` });
    }

    // EV validation: max 510 total, max 252 per stat
    validateStats(poke.evs, 'EVs', 510, 252, label, index, errors);

    // IV validation: max 31 per stat (no total limit)
    validateStatMax(poke.ivs, 'IVs', 31, label, index, errors);
}

function validateStats(
    stats: StatBlock, label: string, maxTotal: number, maxPerStat: number,
    pokeName: string, index: number, errors: VGCParseError[]
): void {
    const total = stats.hp + stats.atk + stats.def + stats.spa + stats.spd + stats.spe;
    if (total > maxTotal) {
        errors.push({
            pokemonIndex: index, field: label.toLowerCase(),
            message: `${pokeName}: ${label} total is ${total}, exceeds maximum of ${maxTotal}.`,
        });
    }

    for (const [key, value] of Object.entries(stats)) {
        if (value > maxPerStat) {
            errors.push({
                pokemonIndex: index, field: label.toLowerCase(),
                message: `${pokeName}: ${label} ${key.toUpperCase()} is ${value}, exceeds maximum of ${maxPerStat}.`,
            });
        }
        if (value < 0) {
            errors.push({
                pokemonIndex: index, field: label.toLowerCase(),
                message: `${pokeName}: ${label} ${key.toUpperCase()} is negative (${value}).`,
            });
        }
    }
}

function validateStatMax(
    stats: StatBlock, label: string, maxPerStat: number,
    pokeName: string, index: number, errors: VGCParseError[]
): void {
    for (const [key, value] of Object.entries(stats)) {
        if (value > maxPerStat) {
            errors.push({
                pokemonIndex: index, field: label.toLowerCase(),
                message: `${pokeName}: ${label} ${key.toUpperCase()} is ${value}, exceeds maximum of ${maxPerStat}.`,
            });
        }
        if (value < 0) {
            errors.push({
                pokemonIndex: index, field: label.toLowerCase(),
                message: `${pokeName}: ${label} ${key.toUpperCase()} is negative (${value}).`,
            });
        }
    }
}
