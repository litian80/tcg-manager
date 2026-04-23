/**
 * FEAT-010: VGC Team List Types
 * TypeScript interfaces for parsed VGC team data stored in vgc_team_lists.parsed_team
 */

export interface VGCPokemon {
    species: string;
    nickname?: string;
    gender?: 'M' | 'F';
    item?: string;
    ability: string;
    teraType?: string;
    level: number;
    nature?: string;
    evs: StatBlock;
    ivs: StatBlock;
    moves: string[];
    shiny?: boolean;
}

export interface StatBlock {
    hp: number;
    atk: number;
    def: number;
    spa: number;
    spd: number;
    spe: number;
}

export interface VGCTeamParseResult {
    pokemon: VGCPokemon[];
    errors: VGCParseError[];
    warnings: string[];
}

export interface VGCParseError {
    /** Which Pokémon (0-indexed), undefined if team-level error */
    pokemonIndex?: number;
    field: string;
    message: string;
}

/** Validation result returned from server actions */
export interface VGCValidationResult {
    isValid: boolean;
    team: VGCPokemon[];
    errors: VGCParseError[];
    warnings: string[];
}
