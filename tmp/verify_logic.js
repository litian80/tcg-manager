const ENERGY_TYPE_MAP = {
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

function formatEnergyName(rawName) {
    return rawName.replace(/Basic\s+\{([A-Z])\}\s+Energy/i, (_match, code) => {
        const typeName = ENERGY_TYPE_MAP[code.toUpperCase()] || code;
        return `${typeName} Energy`;
    });
}

function parseDeckList(deckText) {
    const lines = deckText.trim().split('\n');
    const result = {
        Pokemon: [],
        Trainer: [],
        Energy: [],
        TotalCards: 0,
        Errors: []
    };

    const nameOnlyPattern = /^(\d+)[x\s]+(.+?)\s*$/i;

    for (let line of lines) {
        line = line.trim();
        if (!line) continue;

        const nameOnlyMatch = line.match(nameOnlyPattern);
        if (nameOnlyMatch) {
            const qty = parseInt(nameOnlyMatch[1], 10);
            const rawName = nameOnlyMatch[2].trim();
            const name = formatEnergyName(rawName);

            const lowName = name.toLowerCase();
            const isEnergy = lowName.includes('energy');

            if (isEnergy) {
                result.Energy.push({ qty, name, category: 'energy' });
            } else {
                result.Trainer.push({ qty, name, category: 'trainer' });
            }
            result.TotalCards += qty;
        }
    }
    return result;
}

// Mocking the DB behavior for the test
async function mockValidateDeckListAction(deckText) {
    const parsed = parseDeckList(deckText);
    const trainerCards = parsed.Trainer;
    
    // Simulating DB lookup where "Arven" exists but "Aurven" does not
    const dbTrainerNames = ["Arven", "Boss's Orders", "Professor's Research"];
    
    const errors = [];
    for (const card of trainerCards) {
        if (!dbTrainerNames.some(n => n.toLowerCase() === card.name.toLowerCase())) {
            errors.push(`Card not found: "${card.name}"`);
        }
    }

    return {
        isValid: errors.length === 0,
        errors
    };
}

async function test() {
    console.log("Testing invalid trainer name '4 Aurven'...");
    const result = await mockValidateDeckListAction("4 Aurven");
    console.log("Validation Result:", JSON.stringify(result, null, 2));
    
    if (!result.isValid && result.errors.some(e => e.includes('Card not found: "Aurven"'))) {
        console.log("SUCCESS: '4 Aurven' was correctly rejected.");
    } else {
        console.log("FAILURE: '4 Aurven' was NOT correctly rejected.");
    }
}

test();
