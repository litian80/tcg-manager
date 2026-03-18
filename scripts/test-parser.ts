
import { parseDeckList } from "../utils/deck-validator";

const testDecks = [
    {
        name: "Standard Trainer (Ends in Retrieval)",
        list: "4 Superior Energy Retrieval",
        expectedCategory: "trainer"
    },
    {
        name: "Basic Energy (Ends in Energy)",
        list: "10 Basic {G} Energy SVE 1",
        expectedCategory: "energy"
    },
    {
        name: "Basic Energy (Name only, ends in Energy)",
        list: "10 Grass Energy",
        expectedCategory: "energy"
    },
    {
        name: "Special Energy (Ends in Energy)",
        list: "4 Jet Energy PAL 190",
        expectedCategory: "energy"
    },
    {
        name: "Trainer with Energy in name (Energy Search)",
        list: "4 Energy Search",
        expectedCategory: "trainer"
    },
    {
        name: "Trainer with Energy in name (Energy Switch)",
        list: "2 Energy Switch",
        expectedCategory: "trainer"
    },
    {
        name: "Trainer with Energy in name (Energy Recycler)",
        list: "1 Energy Recycler",
        expectedCategory: "trainer"
    },
    {
        name: "Case-insensitive Trainer",
        list: "4 SUPERIOR ENERGY RETRIEVAL",
        expectedCategory: "trainer"
    },
    {
        name: "Case-insensitive Energy",
        list: "4 jet energy",
        expectedCategory: "energy"
    }
];

function runTest() {
    console.log("Running Parser Tests...");
    let allPassed = true;

    for (const test of testDecks) {
        const result = parseDeckList(test.list);
        const card = result.Pokemon[0] || result.Trainer[0] || result.Energy[0];
        
        if (!card) {
            console.error(`❌ ${test.name}: Failed to parse card from "${test.list}"`);
            allPassed = false;
            continue;
        }

        if (card.category !== test.expectedCategory) {
            console.error(`❌ ${test.name}: Expected ${test.expectedCategory}, got ${card.category} for "${test.list}"`);
            allPassed = false;
        } else {
            console.log(`✅ ${test.name}: Correctly identified as ${card.category}`);
        }
    }

    if (allPassed) {
        console.log("\nAll parser tests PASSED!");
    } else {
        console.log("\nSome parser tests FAILED.");
        process.exit(1);
    }
}

runTest();
