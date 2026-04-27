/**
 * Pokémon GO Team List Validator
 * Validates a team of 6 Pokémon against Great League rules.
 * Species and move names are open text — no lookup validation.
 */

import type { GOPokemon, GOParseError, GOValidationResult } from './types';

/** Great League CP cap */
const MAX_CP = 1500;

/** Required team size */
const TEAM_SIZE = 6;

export function validateGOTeam(pokemon: GOPokemon[]): GOValidationResult {
  const errors: GOParseError[] = [];
  const warnings: string[] = [];

  // Team-level: exactly 6 Pokémon
  if (pokemon.length !== TEAM_SIZE) {
    errors.push({
      field: 'team',
      message: `Team must contain exactly ${TEAM_SIZE} Pokémon (found ${pokemon.length}).`,
    });
  }

  // Team-level: max 1 Best Buddy
  const bestBuddyCount = pokemon.filter(p => p.isBestBuddy).length;
  if (bestBuddyCount > 1) {
    errors.push({
      field: 'bestBuddy',
      message: `Only 1 Best Buddy is allowed per team (found ${bestBuddyCount}).`,
    });
  }

  // Per-Pokémon validation
  pokemon.forEach((mon, index) => {
    // Required fields
    if (!mon.species.trim()) {
      errors.push({ pokemonIndex: index, field: 'species', message: 'Species is required.' });
    }

    if (!mon.cp || mon.cp <= 0) {
      errors.push({ pokemonIndex: index, field: 'cp', message: 'CP is required and must be positive.' });
    } else if (mon.cp > MAX_CP) {
      errors.push({ pokemonIndex: index, field: 'cp', message: `CP must be ≤ ${MAX_CP} for Great League (found ${mon.cp}).` });
    }

    if (!mon.hp || mon.hp <= 0) {
      errors.push({ pokemonIndex: index, field: 'hp', message: 'HP is required and must be positive.' });
    }

    if (!mon.fastAttack.trim()) {
      errors.push({ pokemonIndex: index, field: 'fastAttack', message: 'Fast Attack is required.' });
    }

    if (!mon.chargedAttack1.trim()) {
      errors.push({ pokemonIndex: index, field: 'chargedAttack1', message: 'Charged Attack 1 is required.' });
    }

    // Soft warning: Best Buddy at max CP
    if (mon.isBestBuddy && mon.cp === MAX_CP) {
      warnings.push(
        `Pokémon ${index + 1} (${mon.species || 'unnamed'}): CP is ${MAX_CP} with Best Buddy enabled. Ensure the Best Buddy boost does not push CP above ${MAX_CP}.`
      );
    }
  });

  return {
    isValid: errors.length === 0,
    team: pokemon,
    errors,
    warnings,
  };
}
