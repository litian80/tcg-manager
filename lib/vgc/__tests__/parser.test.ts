/**
 * FEAT-010: Showdown Paste Parser Tests
 */

import { describe, it, expect } from 'vitest';
import { parseShowdownPaste } from '../parser';

const SAMPLE_TEAM = `Flutter Mane @ Booster Energy
Ability: Protosynthesis
Level: 50
Tera Type: Fairy
EVs: 4 HP / 252 SpA / 252 Spe
Timid Nature
IVs: 0 Atk
- Shadow Ball
- Moonblast
- Mystical Fire
- Protect

Incineroar @ Safety Goggles
Ability: Intimidate
Level: 50
Tera Type: Ghost
EVs: 252 HP / 4 Atk / 92 Def / 4 SpD / 156 Spe
Adamant Nature
- Fake Out
- Knock Off
- Flare Blitz
- Parting Shot`;

describe('parseShowdownPaste', () => {
    it('parses a valid two-Pokémon team', () => {
        const result = parseShowdownPaste(SAMPLE_TEAM);

        expect(result.errors).toHaveLength(0);
        expect(result.pokemon).toHaveLength(2);

        // Flutter Mane
        const fm = result.pokemon[0];
        expect(fm.species).toBe('Flutter Mane');
        expect(fm.item).toBe('Booster Energy');
        expect(fm.ability).toBe('Protosynthesis');
        expect(fm.level).toBe(50);
        expect(fm.teraType).toBe('Fairy');
        expect(fm.nature).toBe('Timid');
        expect(fm.evs).toEqual({ hp: 4, atk: 0, def: 0, spa: 252, spd: 0, spe: 252 });
        expect(fm.ivs).toEqual({ hp: 31, atk: 0, def: 31, spa: 31, spd: 31, spe: 31 });
        expect(fm.moves).toEqual(['Shadow Ball', 'Moonblast', 'Mystical Fire', 'Protect']);

        // Incineroar
        const incin = result.pokemon[1];
        expect(incin.species).toBe('Incineroar');
        expect(incin.item).toBe('Safety Goggles');
        expect(incin.ability).toBe('Intimidate');
        expect(incin.evs.hp).toBe(252);
        expect(incin.evs.atk).toBe(4);
        expect(incin.evs.def).toBe(92);
        expect(incin.moves).toHaveLength(4);
    });

    it('parses nickname format: Nickname (Species) @ Item', () => {
        const paste = `Snorlax (Munchlax) @ Leftovers
Ability: Pickup
Level: 50
- Metronome`;

        const result = parseShowdownPaste(paste);
        expect(result.pokemon[0].nickname).toBe('Snorlax');
        expect(result.pokemon[0].species).toBe('Munchlax');
        expect(result.pokemon[0].item).toBe('Leftovers');
    });

    it('parses gender format: Species (F) @ Item', () => {
        const paste = `Gardevoir (F) @ Focus Sash
Ability: Trace
Level: 50
- Moonblast`;

        const result = parseShowdownPaste(paste);
        expect(result.pokemon[0].species).toBe('Gardevoir');
        expect(result.pokemon[0].gender).toBe('F');
        expect(result.pokemon[0].item).toBe('Focus Sash');
    });

    it('parses nickname + gender: Nickname (Species) (M) @ Item', () => {
        const paste = `Tanky (Blissey) (F) @ Leftovers
Ability: Natural Cure
Level: 50
- Soft-Boiled`;

        const result = parseShowdownPaste(paste);
        expect(result.pokemon[0].nickname).toBe('Tanky');
        expect(result.pokemon[0].species).toBe('Blissey');
        expect(result.pokemon[0].gender).toBe('F');
    });

    it('handles Pokémon with no item', () => {
        const paste = `Pikachu
Ability: Static
Level: 50
- Thunderbolt`;

        const result = parseShowdownPaste(paste);
        expect(result.pokemon[0].species).toBe('Pikachu');
        expect(result.pokemon[0].item).toBeUndefined();
    });

    it('defaults level to 100 when not specified (Showdown convention)', () => {
        const paste = `Pikachu @ Light Ball
Ability: Static
- Thunderbolt`;

        const result = parseShowdownPaste(paste);
        expect(result.pokemon[0].level).toBe(100);
    });

    it('parses shiny correctly', () => {
        const paste = `Pikachu @ Light Ball
Ability: Static
Level: 50
Shiny: Yes
- Thunderbolt`;

        const result = parseShowdownPaste(paste);
        expect(result.pokemon[0].shiny).toBe(true);
    });

    it('returns error for empty paste', () => {
        const result = parseShowdownPaste('');
        expect(result.errors.length).toBeGreaterThan(0);
        expect(result.pokemon).toHaveLength(0);
    });

    it('returns error when no ability is provided', () => {
        const paste = `Pikachu @ Light Ball
Level: 50
- Thunderbolt`;

        const result = parseShowdownPaste(paste);
        const abilityErrors = result.errors.filter(e => e.field === 'ability');
        expect(abilityErrors.length).toBeGreaterThan(0);
    });

    it('returns error when more than 4 moves', () => {
        const paste = `Pikachu @ Light Ball
Ability: Static
Level: 50
- Thunderbolt
- Thunder
- Volt Tackle
- Iron Tail
- Quick Attack`;

        const result = parseShowdownPaste(paste);
        const moveErrors = result.errors.filter(e => e.field === 'moves');
        expect(moveErrors.length).toBeGreaterThan(0);
    });

    it('handles 6 Pokémon team without error', () => {
        const blocks = Array.from({ length: 6 }, (_, i) => 
            `Mon${i + 1} @ Item${i + 1}\nAbility: Ability\nLevel: 50\n- Move${i + 1}`
        );
        const paste = blocks.join('\n\n');

        const result = parseShowdownPaste(paste);
        expect(result.pokemon).toHaveLength(6);
    });

    it('errors on more than 6 Pokémon', () => {
        const blocks = Array.from({ length: 7 }, (_, i) =>
            `Mon${i + 1} @ Item${i + 1}\nAbility: Ability\nLevel: 50\n- Move${i + 1}`
        );
        const paste = blocks.join('\n\n');

        const result = parseShowdownPaste(paste);
        const teamErrors = result.errors.filter(e => e.field === 'team');
        expect(teamErrors.length).toBeGreaterThan(0);
        // Should still parse first 6
        expect(result.pokemon).toHaveLength(6);
    });

    it('parses all stat abbreviations in EVs', () => {
        const paste = `Pikachu @ Light Ball
Ability: Static
Level: 50
EVs: 100 HP / 100 Atk / 100 Def / 100 SpA / 100 SpD / 10 Spe
- Thunderbolt`;

        const result = parseShowdownPaste(paste);
        const evs = result.pokemon[0].evs;
        expect(evs.hp).toBe(100);
        expect(evs.atk).toBe(100);
        expect(evs.def).toBe(100);
        expect(evs.spa).toBe(100);
        expect(evs.spd).toBe(100);
        expect(evs.spe).toBe(10);
    });
});
