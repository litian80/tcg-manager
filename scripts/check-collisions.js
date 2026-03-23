
const fs = require('fs');

function normalizeName(name) {
    return name.replace(/[^a-zA-Z]/g, '').toLowerCase();
}

const data = JSON.parse(fs.readFileSync('Cards/cards_data.json', 'utf8'));

const nameMap = new Map(); // normalized -> set of original names

data.forEach(card => {
    const originalName = card.Name;
    if (!originalName || typeof originalName !== 'string') return;
    const normalized = normalizeName(originalName);
    
    if (!nameMap.has(normalized)) {
        nameMap.set(normalized, new Set());
    }
    nameMap.get(normalized).add(originalName);
});

console.log("Analyzing collisions...");
let collisionCount = 0;
for (const [normalized, originals] of nameMap.entries()) {
    if (originals.size > 1) {
        console.log(`Collision: "${normalized}"`);
        originals.forEach(name => console.log(`  - ${name}`));
        collisionCount++;
    }
}

console.log(`\nTotal unique normalized names: ${nameMap.size}`);
console.log(`Total collisions: ${collisionCount}`);
