/**
 * FEAT-010: VGC Team Validator Tests
 */

import { describe, it, expect } from 'vitest';
import { validateTeam } from '../validator';
import type { VGCPokemon, StatBlock } from '../types';

function makeDefaultStats(): StatBlock {
    return { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
}

function makeFullIVs(): StatBlock {
    return { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 };
}

function makePokemon(overrides: Partial<VGCPokemon> = {}): VGCPokemon {
    return {
        species: 'Pikachu',
        ability: 'Static',
        level: 50,
        evs: makeDefaultStats(),
        ivs: makeFullIVs(),
        moves: ['Thunderbolt'],
        ...overrides,
    };
}

describe('validateTeam', () => {
    it('accepts a valid single Pokémon', () => {
        const result = validateTeam([makePokemon()]);
        expect(result.errors).toHaveLength(0);
    });

    it('accepts a valid 6-Pokémon team', () => {
        const team = [
            makePokemon({ species: 'Pikachu', item: 'Light Ball', moves: ['Thunderbolt'] }),
            makePokemon({ species: 'Charizard', item: 'Charcoal', moves: ['Flamethrower'] }),
            makePokemon({ species: 'Blastoise', item: 'Leftovers', moves: ['Surf'] }),
            makePokemon({ species: 'Venusaur', item: 'Black Sludge', moves: ['Energy Ball'] }),
            makePokemon({ species: 'Snorlax', item: 'Assault Vest', moves: ['Body Slam'] }),
            makePokemon({ species: 'Gengar', item: 'Life Orb', moves: ['Shadow Ball'] }),
        ];
        const result = validateTeam(team);
        expect(result.errors).toHaveLength(0);
    });

    it('errors on empty team', () => {
        const result = validateTeam([]);
        expect(result.errors.length).toBeGreaterThan(0);
    });

    it('errors on duplicate species (Species Clause)', () => {
        const team = [
            makePokemon({ species: 'Pikachu', item: 'Light Ball' }),
            makePokemon({ species: 'Pikachu', item: 'Leftovers' }),
        ];
        const result = validateTeam(team);
        const speciesErrors = result.errors.filter(e => e.field === 'species' && e.message.includes('Duplicate'));
        expect(speciesErrors.length).toBeGreaterThan(0);
    });

    it('errors on duplicate items (Item Clause)', () => {
        const team = [
            makePokemon({ species: 'Pikachu', item: 'Leftovers' }),
            makePokemon({ species: 'Charizard', item: 'Leftovers' }),
        ];
        const result = validateTeam(team);
        const itemErrors = result.errors.filter(e => e.field === 'item' && e.message.includes('Duplicate'));
        expect(itemErrors.length).toBeGreaterThan(0);
    });

    it('errors on unknown species', () => {
        const team = [makePokemon({ species: 'FakeMon' })];
        const result = validateTeam(team);
        const speciesErrors = result.errors.filter(e => e.field === 'species' && e.message.includes('Unknown'));
        expect(speciesErrors.length).toBeGreaterThan(0);
    });

    it('errors on unknown move', () => {
        const team = [makePokemon({ moves: ['Thunderbolt', 'Fake Move 9000'] })];
        const result = validateTeam(team);
        const moveErrors = result.errors.filter(e => e.field === 'moves' && e.message.includes('Unknown'));
        expect(moveErrors.length).toBeGreaterThan(0);
    });

    it('errors on unknown ability', () => {
        const team = [makePokemon({ ability: 'Not A Real Ability' })];
        const result = validateTeam(team);
        const abilityErrors = result.errors.filter(e => e.field === 'ability' && e.message.includes('Unknown'));
        expect(abilityErrors.length).toBeGreaterThan(0);
    });

    it('errors on unknown item', () => {
        const team = [makePokemon({ item: 'NotARealItem' })];
        const result = validateTeam(team);
        const itemErrors = result.errors.filter(e => e.field === 'item' && e.message.includes('Unknown'));
        expect(itemErrors.length).toBeGreaterThan(0);
    });

    it('errors on EV total exceeding 510', () => {
        const team = [makePokemon({
            evs: { hp: 252, atk: 252, def: 252, spa: 0, spd: 0, spe: 0 }, // total 756
        })];
        const result = validateTeam(team);
        const evErrors = result.errors.filter(e => e.field === 'evs');
        expect(evErrors.length).toBeGreaterThan(0);
    });

    it('errors on single EV exceeding 252', () => {
        const team = [makePokemon({
            evs: { hp: 300, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        })];
        const result = validateTeam(team);
        const evErrors = result.errors.filter(e => e.field === 'evs' && e.message.includes('252'));
        expect(evErrors.length).toBeGreaterThan(0);
    });

    it('errors on IV exceeding 31', () => {
        const team = [makePokemon({
            ivs: { hp: 32, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        })];
        const result = validateTeam(team);
        const ivErrors = result.errors.filter(e => e.field === 'ivs');
        expect(ivErrors.length).toBeGreaterThan(0);
    });

    it('errors on unknown Tera Type', () => {
        const team = [makePokemon({ teraType: 'Cosmic' })];
        const result = validateTeam(team);
        const teraErrors = result.errors.filter(e => e.field === 'teraType');
        expect(teraErrors.length).toBeGreaterThan(0);
    });

    it('accepts valid Tera Types including Stellar', () => {
        const team = [makePokemon({ teraType: 'Stellar' })];
        const result = validateTeam(team);
        const teraErrors = result.errors.filter(e => e.field === 'teraType');
        expect(teraErrors).toHaveLength(0);
    });

    it('errors on duplicate moves', () => {
        const team = [makePokemon({ moves: ['Thunderbolt', 'Thunderbolt'] })];
        const result = validateTeam(team);
        const moveErrors = result.errors.filter(e => e.field === 'moves' && e.message.includes('Duplicate'));
        expect(moveErrors.length).toBeGreaterThan(0);
    });

    it('errors on unknown nature', () => {
        const team = [makePokemon({ nature: 'Grumpy' })];
        const result = validateTeam(team);
        const natureErrors = result.errors.filter(e => e.field === 'nature');
        expect(natureErrors.length).toBeGreaterThan(0);
    });

    it('accepts valid nature', () => {
        const team = [makePokemon({ nature: 'Timid' })];
        const result = validateTeam(team);
        const natureErrors = result.errors.filter(e => e.field === 'nature');
        expect(natureErrors).toHaveLength(0);
    });

    it('is case-insensitive for name checks', () => {
        const team = [makePokemon({
            species: 'pikachu',
            ability: 'static',
            item: 'light ball',
            moves: ['thunderbolt'],
        })];
        const result = validateTeam(team);
        expect(result.errors).toHaveLength(0);
    });
});
