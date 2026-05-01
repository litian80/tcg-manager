import type { ParsedCard, DeckParseResult } from "@/types/deck";

// Energy type code to full name mapping
const ENERGY_TYPE_MAP: Record<string, string> = {
    'G': 'Grass',
    'R': 'Fire',
    'W': 'Water',
    'L': 'Lightning',
    'P': 'Psychic',
    'F': 'Fighting',
    'D': 'Darkness',
    'M': 'Metal',
    'Y': 'Fairy',
    'N': 'Dragon',
    'C': 'Colorless',
};

export function normalizeCardName(name: string): string {
    return name
        .replace(/[\u2018\u2019\u00b4\u0060]/g, "'") // Curly apostrophes and backticks
        .replace(/[\u201c\u201d]/g, '"') // Curly quotes
        .replace(/[\u2013\u2014]/g, '-') // En/Em dashes
        .trim()
        .replace(/\s+/g, ' '); // Collapse spaces
}

function formatEnergyName(rawName: string): string {
    // Convert "Basic {G} Energy" → "Grass Energy"
    let name = rawName.replace(/Basic\s+\{([A-Z])\}\s+Energy/i, (_match, code: string) => {
        const typeName = ENERGY_TYPE_MAP[code.toUpperCase()] || code;
        return `${typeName} Energy`;
    });
    // Convert any remaining {X} energy type codes (e.g. "Telepathic {P} Energy" → "Telepathic Psychic Energy")
    name = name.replace(/\{([A-Z])\}/gi, (_match, code: string) => {
        return ENERGY_TYPE_MAP[code.toUpperCase()] || code;
    });
    return name;
}

export function parseDeckList(deckText: string): DeckParseResult {
    // Normalize UTF-8 characters and common mis-encodings
    const normalizedText = deckText
        .replace(/PokÃ©mon/g, 'Pokémon')
        .replace(/Pokemon/g, 'Pokémon')
        .replace(/Pok\u00e9mon/g, 'Pokémon');

    const lines = normalizedText.trim().split('\n');
    
    const result: DeckParseResult = {
        Pokemon: [],
        Trainer: [],
        Energy: [],
        TotalCards: 0,
        Errors: []
    };
    
    // More flexible category detection
    const categoryPatterns = {
        pokemon: /^(?:Pokémon|PokÃ©mon|Pokemon):?\s*(?:\(?\d+\)?)?$/i,
        trainer: /^(?:Trainer|Trainer Cards|Trainers):?\s*(?:\(?\d+\)?)?$/i,
        energy: /^(?:Energy|Energies):?\s*(?:\(?\d+\)?)?$/i
    };

    let currentCategory: keyof Omit<DeckParseResult, 'TotalCards' | 'Errors'> = "Pokemon";
    
    // Standard line pattern: "2 Entei V BRS 22" or "2 Entei V (BRS) 22"
    const standardPattern = /^(\d+)(?:x\s*|\s+)(.+?)\s+\(?([A-Z0-9-]{2,7})\)?\s+(\d+)\s*$/i;
    
    // Basic Energy pattern: 11 Basic {R} Energy SVE 2
    const basicEnergyPattern = /^(\d+)(?:x\s*|\s+)(Basic\s+{[^}]+}\s+Energy)(?:\s+([A-Z0-9-]{2,7})\s+(\d+))?$/i;

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        // Skip informational lines from Pokemon TCG Live (e.g. "Total Cards: 60")
        if (/^Total Cards:\s*\d+$/i.test(line)) continue;
            
        // Check for category headers
        if (categoryPatterns.pokemon.test(line)) {
            currentCategory = "Pokemon";
            continue;
        } else if (categoryPatterns.trainer.test(line)) {
            currentCategory = "Trainer";
            continue;
        } else if (categoryPatterns.energy.test(line)) {
            currentCategory = "Energy";
            continue;
        }
        
        // Try energy patterns (Basic Energy)
        // Try basic energy pattern: "11 Basic {R} Energy SVE 2"
        const energyMatch = line.match(basicEnergyPattern);
        if (energyMatch) {
            const qty = parseInt(energyMatch[1], 10);
            const rawName = energyMatch[2].trim();
            const name = normalizeCardName(formatEnergyName(rawName));
            const setCode = energyMatch[3]?.trim().toUpperCase() || "ENERGY";
            const cardNumber = energyMatch[4]?.trim() || "0";
            
            const cardObj: ParsedCard = {
                qty,
                name,
                set: setCode,
                number: cardNumber,
                raw: line,
                isBasicEnergy: true,
                category: 'energy'
            };
            result["Energy"].push(cardObj);
            result.TotalCards += qty;
            continue;
        }

        // Try simple energy pattern (fallback for name + energy suffix + set/number)
        const simpleEnergyPattern = /^(\d+)(?:x\s*|\s+)(.+?\s+Energy)(?:\s+([A-Z0-9-]{2,7})\s+(\d+))?$/i;
        const simpleMatch = line.match(simpleEnergyPattern);
        if (simpleMatch) {
            const qty = parseInt(simpleMatch[1], 10);
            const rawName = simpleMatch[2].trim();
            const name = normalizeCardName(formatEnergyName(rawName));
            const lowName = name.toLowerCase();
            
            const isBasicEnergy = !lowName.includes("special") && !lowName.includes("double");

            const cardObj: ParsedCard = {
                qty,
                name,
                set: simpleMatch[3]?.trim().toUpperCase() || "ENERGY",
                number: simpleMatch[4]?.trim() || "0",
                raw: line,
                isBasicEnergy: isBasicEnergy,
                category: 'energy'
            };
            result["Energy"].push(cardObj);
            result.TotalCards += qty;
            continue;
        }

        // Try standard pattern (for Pokemon/Trainer cards, or non-energy lines)
        // Matches: "2 Entei V BRS 22" or "2 Entei V (BRS) 22"
        const standardMatch = line.match(standardPattern);
        if (standardMatch) {
            const qty = parseInt(standardMatch[1], 10);
            const name = normalizeCardName(standardMatch[2]);
            const lowName = name.toLowerCase();
            const setCode = standardMatch[3].trim().toUpperCase();
            const cardNumber = standardMatch[4].trim();
            
            // Auto-detect category for Energy if name ends with 'Energy'
            let detectedCategory = currentCategory.toLowerCase() as 'pokemon' | 'trainer' | 'energy';
            let resultCategory = currentCategory;
            
            if (lowName.endsWith('energy')) {
                detectedCategory = 'energy';
                resultCategory = 'Energy';
            }

            const cardObj: ParsedCard = {
                qty,
                name,
                set: setCode,
                number: cardNumber,
                raw: line,
                category: detectedCategory
            };
            
            result[resultCategory].push(cardObj);
            result.TotalCards += qty;
            continue;
        }

        // Try parenthesized format: "3 Munkidori (TWM-95)"
        const parenPattern = /^(\d+)(?:x\s*|\s+)(.+?)\s+\(([A-Z0-9]+)-(\d+)\)\s*$/i;
        const parenMatch = line.match(parenPattern);
        if (parenMatch) {
            const qty = parseInt(parenMatch[1], 10);
            const name = normalizeCardName(parenMatch[2]);
            const lowName = name.toLowerCase();
            const setCode = parenMatch[3].trim().toUpperCase();
            const cardNumber = parenMatch[4].trim();

            // Respect currentCategory; auto-detect energy by name
            let detectedCategory = currentCategory.toLowerCase() as 'pokemon' | 'trainer' | 'energy';
            let resultCategory = currentCategory;
            if (lowName.endsWith('energy')) {
                detectedCategory = 'energy';
                resultCategory = 'Energy';
            }

            const cardObj: ParsedCard = {
                qty,
                name,
                set: setCode,
                number: cardNumber,
                raw: line,
                category: detectedCategory
            };

            result[resultCategory].push(cardObj);
            result.TotalCards += qty;
            continue;
        }

        // Name-only fallback: "4 Arven" or "7 Darkness Energy"
        // Auto-detect energy by name; otherwise respect currentCategory
        const nameOnlyPattern = /^(\d+)(?:x\s*|\s+)(.+?)\s*$/i;
        const nameOnlyMatch = line.match(nameOnlyPattern);
        if (nameOnlyMatch) {
            const qty = parseInt(nameOnlyMatch[1], 10);
            const rawName = nameOnlyMatch[2].trim();
            const name = normalizeCardName(formatEnergyName(rawName));

            const lowName = name.toLowerCase();
            const isEnergy = lowName.endsWith('energy');
            const isBasicEnergy = isEnergy && !lowName.includes("special") && !lowName.includes("double");

            // Auto-detect energy by name; otherwise respect current section header
            let detectedCategory: 'pokemon' | 'trainer' | 'energy';
            let resultCategory: keyof Omit<DeckParseResult, 'TotalCards' | 'Errors'>;
            if (isEnergy) {
                detectedCategory = 'energy';
                resultCategory = 'Energy';
            } else {
                detectedCategory = currentCategory.toLowerCase() as 'pokemon' | 'trainer' | 'energy';
                resultCategory = currentCategory;
            }

            const cardObj: ParsedCard = {
                qty,
                name,
                set: "",
                number: "",
                raw: line,
                isBasicEnergy: isBasicEnergy,
                category: detectedCategory
            };

            result[resultCategory].push(cardObj);
            result.TotalCards += qty;
            continue;
        }
            
        // If no match, log error
        result.Errors.push({
            line: line,
            message: "Failed to parse line format."
        });
    }

    return result;
}

/**
 * Merge duplicate ParsedCard entries (same name + set + number) by summing quantities.
 * Used by display components to consolidate identical lines like "1 Duskull PRE 35" × 2 → "2 Duskull PRE 35".
 */
export function mergeCards(cards: ParsedCard[]): ParsedCard[] {
    const map = new Map<string, ParsedCard>();
    for (const card of cards) {
        const key = `${card.name}|${card.set}|${card.number}`;
        const existing = map.get(key);
        if (existing) {
            existing.qty += card.qty;
        } else {
            map.set(key, { ...card });
        }
    }
    return Array.from(map.values());
}

/**
 * Trainer sub-type sort priority (matches secondary_category values in prod DB).
 * Lower number = appears first in the sorted list.
 */
const TRAINER_SUBTYPE_ORDER: Record<string, number> = {
    'supporter': 0,
    'item': 1,
    'tool': 2,
    'stadium': 3,
};

/**
 * Sort cards within a category according to display rules.
 * 
 * - Pokémon: Quantity (desc), then Name (alpha)
 * - Trainer: Sub-type priority (Supporter → Item → TM → Tool → Ace Spec → Stadium),
 *            then Quantity (desc), then Name (alpha).
 *            Requires secondaryCategory to be set on cards for sub-type sorting.
 * - Energy:  Special first, Basic last, then Quantity (desc), then Name (alpha)
 */
export function sortCards(cards: ParsedCard[], category: 'pokemon' | 'trainer' | 'energy'): ParsedCard[] {
    return [...cards].sort((a, b) => {
        if (category === 'trainer') {
            const aType = TRAINER_SUBTYPE_ORDER[(a.secondaryCategory || '').toLowerCase()] ?? 99;
            const bType = TRAINER_SUBTYPE_ORDER[(b.secondaryCategory || '').toLowerCase()] ?? 99;
            if (aType !== bType) return aType - bType;
        }

        if (category === 'energy') {
            // Special energy first (isBasicEnergy = false), Basic energy last
            const aBasic = a.isBasicEnergy ? 1 : 0;
            const bBasic = b.isBasicEnergy ? 1 : 0;
            if (aBasic !== bBasic) return aBasic - bBasic;
        }

        if (category === 'pokemon') {
            // Name alphabetical first, then quantity descending
            const nameCompare = a.name.localeCompare(b.name);
            if (nameCompare !== 0) return nameCompare;
            return b.qty - a.qty;
        }

        // Trainers & Energy: Quantity descending, then name alphabetical
        if (b.qty !== a.qty) return b.qty - a.qty;
        return a.name.localeCompare(b.name);
    });
}

/**
 * Checks if a card's regulation mark is legal for standard format 
 * based on the tournament date.
 */
export function isRegulationMarkLegal(
    regulationMark: string | null | undefined,
    tournamentDate: Date
): boolean {
    if (!regulationMark) return false;
    
    const mark = regulationMark.trim().toUpperCase();
    
    // Rotation on April 10, 2026
    const rotationDate = new Date("2026-04-10T00:00:00Z"); // UTC or local doesn't matter strictly, but lets assume UTC midnight.
    
    if (tournamentDate >= rotationDate) {
        // H or newer
        return mark >= 'H';
    } else {
        // G or newer
        return mark >= 'G';
    }
}

/**
 * Checks if a set is excluded explicitly based on standard format release dates.
 */
export function isSetExcluded(
    setCode: string | undefined | null,
    tournamentDate: Date
): boolean {
    if (!setCode) return false;
    
    const rotationDate = new Date("2026-04-10T00:00:00Z");
    if (tournamentDate < rotationDate) {
        // Exclude POR set prior to April 10
        if (setCode.toUpperCase() === 'POR') return true;
    }
    return false;
}

