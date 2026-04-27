/**
 * Pokémon GO Team List Types
 * TypeScript interfaces for parsed GO team data stored in go_team_lists.parsed_team
 */

/** A single Pokémon in the GO team list */
export interface GOPokemon {
  /** Species name — open text, e.g. "Galarian Rapidash", "Shadow Feraligatr" */
  species: string;
  /** Pokémon's in-game nickname (staff view only) */
  nickname: string;
  /** Combat Power, must be ≤ 1500 for Great League */
  cp: number;
  /** Hit Points (staff view only) */
  hp: number;
  /** Fast Attack name — open text */
  fastAttack: string;
  /** Charged Attack 1 — open text */
  chargedAttack1: string;
  /** Charged Attack 2 — open text, empty string if none */
  chargedAttack2: string;
  /** Best Buddy status — max 1 per team (soft warning) */
  isBestBuddy: boolean;
}

export interface GOParseError {
  /** Which Pokémon (0-indexed), undefined if team-level error */
  pokemonIndex?: number;
  field: string;
  message: string;
}

export interface GOValidationResult {
  isValid: boolean;
  team: GOPokemon[];
  errors: GOParseError[];
  warnings: string[];
}

/** Default empty Pokémon for form initialisation */
export function createEmptyGOPokemon(): GOPokemon {
  return {
    species: '',
    nickname: '',
    cp: 0,
    hp: 0,
    fastAttack: '',
    chargedAttack1: '',
    chargedAttack2: '',
    isBestBuddy: false,
  };
}
