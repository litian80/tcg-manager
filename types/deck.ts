export interface ParsedCard {
    qty: number;
    name: string;
    set: string;
    number: string;
    raw: string;
    isBasicEnergy?: boolean;
    category?: 'pokemon' | 'trainer' | 'energy';
}

export interface ParsedDeckCategories {
    Pokemon?: ParsedCard[];
    Trainer?: ParsedCard[];
    Energy?: ParsedCard[];
}

export interface DeckParseResult {
    Pokemon: ParsedCard[];
    Trainer: ParsedCard[];
    Energy: ParsedCard[];
    TotalCards: number;
    Errors: { line: string; message: string }[];
}
