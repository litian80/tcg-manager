/**
 * VGC Stat Calculator
 * Calculates actual in-game stats from Base Stats + Level + Nature + EVs + IVs.
 * 
 * Formula (Gen 3+):
 *   HP  = floor((2 * Base + IV + floor(EV/4)) * Level / 100) + Level + 10
 *   Other = floor((floor((2 * Base + IV + floor(EV/4)) * Level / 100) + 5) * NatureMod)
 * 
 * Special: Shedinja always has HP = 1
 */

import { StatBlock, VGCPokemon } from './types';
import baseStatsData from './data/base-stats.json';
import naturesData from './data/natures.json';

type BaseStatsMap = Record<string, [number, number, number, number, number, number]>;
type NatureEffects = Record<string, { plus?: string; minus?: string }>;

const BASE_STATS = baseStatsData as unknown as BaseStatsMap;
const NATURE_EFFECTS = naturesData as unknown as NatureEffects;

// Order: [hp, atk, def, spa, spd, spe]
const STAT_KEYS: (keyof StatBlock)[] = ['hp', 'atk', 'def', 'spa', 'spd', 'spe'];

/**
 * Look up base stats for a species. Handles case-insensitive matching.
 * Returns [hp, atk, def, spa, spd, spe] or null if not found.
 */
export function getBaseStats(species: string): [number, number, number, number, number, number] | null {
    // Try exact match first
    if (BASE_STATS[species]) return BASE_STATS[species];

    // Case-insensitive lookup
    const lower = species.toLowerCase();
    for (const [key, value] of Object.entries(BASE_STATS)) {
        if (key.toLowerCase() === lower) return value;
    }

    return null;
}

/**
 * Get the nature modifier for a given stat.
 * Returns 1.1 (boosted), 0.9 (hindered), or 1.0 (neutral).
 */
export function getNatureModifier(nature: string | undefined, stat: keyof StatBlock): number {
    if (!nature) return 1.0;
    const effects = NATURE_EFFECTS[nature];
    if (!effects) return 1.0;
    if (effects.plus === stat) return 1.1;
    if (effects.minus === stat) return 0.9;
    return 1.0;
}

/**
 * Calculate a single stat value.
 */
function calcStat(
    base: number,
    iv: number,
    ev: number,
    level: number,
    nature: string | undefined,
    statKey: keyof StatBlock,
    isShedinja: boolean
): number {
    if (statKey === 'hp') {
        if (isShedinja) return 1;
        return Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + level + 10;
    }
    const raw = Math.floor((2 * base + iv + Math.floor(ev / 4)) * level / 100) + 5;
    const natureMod = getNatureModifier(nature, statKey);
    return Math.floor(raw * natureMod);
}

/**
 * Calculate all 6 stats for a VGCPokemon.
 * Returns a StatBlock with calculated values, or null if base stats not found.
 */
export function calculateStats(pokemon: VGCPokemon): StatBlock | null {
    const baseStats = getBaseStats(pokemon.species);
    if (!baseStats) return null;

    const isShedinja = pokemon.species.toLowerCase() === 'shedinja';
    const result: StatBlock = { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };

    for (let i = 0; i < STAT_KEYS.length; i++) {
        const key = STAT_KEYS[i];
        result[key] = calcStat(
            baseStats[i],
            pokemon.ivs[key],
            pokemon.evs[key],
            pokemon.level,
            pokemon.nature,
            key,
            isShedinja
        );
    }

    return result;
}

/**
 * Format calculated stats as a compact string.
 * Example: "155 / 182 / 95 / 63 / 96 / 150"
 */
export function formatCalculatedStats(stats: StatBlock): string {
    return `${stats.hp} / ${stats.atk} / ${stats.def} / ${stats.spa} / ${stats.spd} / ${stats.spe}`;
}
