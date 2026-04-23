/**
 * FEAT-010: Showdown Paste Parser
 * Parses Pokémon Showdown team export text into structured VGCPokemon objects.
 * 
 * Format reference: https://pokemonshowdown.com/
 * Each Pokémon block is separated by a blank line.
 * Line 1: Species (Gender) @ Item  OR  Nickname (Species) (Gender) @ Item
 * Ability: X
 * Level: X
 * Shiny: Yes
 * Tera Type: X
 * EVs: X HP / X Atk / ...
 * IVs: X HP / X Atk / ...
 * Nature Nature
 * - Move 1
 * - Move 2
 */

import { VGCPokemon, VGCTeamParseResult, VGCParseError, StatBlock } from './types';

const DEFAULT_STAT_BLOCK: StatBlock = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
const FULL_IV_BLOCK: StatBlock = { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };

const STAT_ALIASES: Record<string, keyof StatBlock> = {
    'hp': 'hp', 'atk': 'atk', 'def': 'def',
    'spa': 'spa', 'spd': 'spd', 'spe': 'spe',
    'attack': 'atk', 'defense': 'def',
    'special attack': 'spa', 'sp. atk': 'spa', 'spatk': 'spa',
    'special defense': 'spd', 'sp. def': 'spd', 'spdef': 'spd',
    'speed': 'spe',
};

/**
 * Parse a full Showdown paste into a team parse result.
 */
export function parseShowdownPaste(text: string): VGCTeamParseResult {
    const errors: VGCParseError[] = [];
    const warnings: string[] = [];

    if (!text || !text.trim()) {
        errors.push({ field: 'team', message: 'Team paste is empty.' });
        return { pokemon: [], errors, warnings };
    }

    // Split into Pokémon blocks by blank lines
    const blocks = text.trim().split(/\n\s*\n/).filter(b => b.trim());

    if (blocks.length === 0) {
        errors.push({ field: 'team', message: 'No Pokémon found in paste.' });
        return { pokemon: [], errors, warnings };
    }

    if (blocks.length > 6) {
        errors.push({ field: 'team', message: `Too many Pokémon (${blocks.length}). VGC teams have a maximum of 6.` });
    }

    const pokemon: VGCPokemon[] = [];

    for (let i = 0; i < Math.min(blocks.length, 6); i++) {
        const result = parsePokemonBlock(blocks[i], i);
        pokemon.push(result.pokemon);
        errors.push(...result.errors);
        warnings.push(...result.warnings);
    }

    return { pokemon, errors, warnings };
}

interface PokemonBlockResult {
    pokemon: VGCPokemon;
    errors: VGCParseError[];
    warnings: string[];
}

function parsePokemonBlock(block: string, index: number): PokemonBlockResult {
    const lines = block.trim().split('\n').map(l => l.trim()).filter(l => l);
    const errors: VGCParseError[] = [];
    const warnings: string[] = [];

    if (lines.length === 0) {
        errors.push({ pokemonIndex: index, field: 'block', message: 'Empty Pokémon block.' });
        return {
            pokemon: { species: '', ability: '', level: 50, evs: { ...DEFAULT_STAT_BLOCK }, ivs: { ...FULL_IV_BLOCK }, moves: [] },
            errors, warnings,
        };
    }

    // Parse first line: Species/Nickname/Gender/Item
    const { species, nickname, gender, item } = parseFirstLine(lines[0]);
    
    if (!species) {
        errors.push({ pokemonIndex: index, field: 'species', message: `Could not parse species from: "${lines[0]}"` });
    }

    let ability = '';
    let level = 50; // VGC default
    let teraType: string | undefined;
    let nature: string | undefined;
    let shiny = false;
    const evs: StatBlock = { ...DEFAULT_STAT_BLOCK };
    const ivs: StatBlock = { ...FULL_IV_BLOCK };
    const moves: string[] = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i];

        if (line.startsWith('- ')) {
            // Move line
            const moveName = line.substring(2).trim();
            if (moveName) moves.push(moveName);
        } else if (line.toLowerCase().startsWith('ability:')) {
            ability = line.substring('ability:'.length).trim();
        } else if (line.toLowerCase().startsWith('level:')) {
            const parsed = parseInt(line.substring('level:'.length).trim(), 10);
            if (!isNaN(parsed) && parsed >= 1 && parsed <= 100) {
                level = parsed;
            }
        } else if (line.toLowerCase().startsWith('tera type:')) {
            teraType = line.substring('tera type:'.length).trim();
        } else if (line.toLowerCase().startsWith('shiny:')) {
            shiny = line.substring('shiny:'.length).trim().toLowerCase() === 'yes';
        } else if (line.toLowerCase().startsWith('evs:')) {
            parseStatLine(line.substring('evs:'.length).trim(), evs);
        } else if (line.toLowerCase().startsWith('ivs:')) {
            parseStatLine(line.substring('ivs:'.length).trim(), ivs);
        } else if (line.toLowerCase().endsWith(' nature')) {
            nature = line.substring(0, line.length - ' nature'.length).trim();
        }
    }

    if (!ability) {
        errors.push({ pokemonIndex: index, field: 'ability', message: `${species || `Pokémon #${index + 1}`}: Missing Ability.` });
    }

    if (moves.length === 0) {
        errors.push({ pokemonIndex: index, field: 'moves', message: `${species || `Pokémon #${index + 1}`}: No moves found.` });
    } else if (moves.length > 4) {
        errors.push({ pokemonIndex: index, field: 'moves', message: `${species || `Pokémon #${index + 1}`}: Too many moves (${moves.length}). Max 4.` });
    }

    return {
        pokemon: {
            species: species || '',
            ...(nickname ? { nickname } : {}),
            ...(gender ? { gender } : {}),
            ...(item ? { item } : {}),
            ability,
            ...(teraType ? { teraType } : {}),
            level,
            ...(nature ? { nature } : {}),
            evs,
            ivs,
            moves: moves.slice(0, 4),
            ...(shiny ? { shiny } : {}),
        },
        errors,
        warnings,
    };
}

/**
 * Parse the first line of a Pokémon block.
 * 
 * Formats:
 *   Species @ Item
 *   Species (F) @ Item
 *   Nickname (Species) @ Item
 *   Nickname (Species) (M) @ Item
 *   Species
 */
function parseFirstLine(line: string): { species: string; nickname?: string; gender?: 'M' | 'F'; item?: string } {
    let remaining = line;
    let item: string | undefined;

    // Extract item after @
    const atIndex = remaining.lastIndexOf(' @ ');
    if (atIndex !== -1) {
        item = remaining.substring(atIndex + 3).trim();
        remaining = remaining.substring(0, atIndex).trim();
    }

    // Extract gender suffix (M) or (F) at end
    let gender: 'M' | 'F' | undefined;
    const genderMatch = remaining.match(/\s*\((M|F)\)\s*$/);
    if (genderMatch) {
        gender = genderMatch[1] as 'M' | 'F';
        remaining = remaining.substring(0, remaining.length - genderMatch[0].length).trim();
    }

    // Check for Nickname (Species) pattern
    let species: string;
    let nickname: string | undefined;

    const speciesMatch = remaining.match(/^(.+?)\s*\(([^()]+)\)\s*$/);
    if (speciesMatch) {
        nickname = speciesMatch[1].trim();
        species = speciesMatch[2].trim();
    } else {
        species = remaining.trim();
    }

    return {
        species,
        ...(nickname ? { nickname } : {}),
        ...(gender ? { gender } : {}),
        ...(item ? { item } : {}),
    };
}

/**
 * Parse a stat allocation line like "252 HP / 4 Atk / 252 Spe"
 */
function parseStatLine(text: string, block: StatBlock): void {
    const parts = text.split('/');
    for (const part of parts) {
        const trimmed = part.trim();
        const match = trimmed.match(/^(\d+)\s+(.+)$/);
        if (match) {
            const value = parseInt(match[1], 10);
            const statName = match[2].trim().toLowerCase();
            const key = STAT_ALIASES[statName];
            if (key && !isNaN(value)) {
                block[key] = value;
            }
        }
    }
}
