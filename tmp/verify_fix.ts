import { validateDeckListAction } from './app/actions/deck-validation';

async function test() {
    console.log("Testing invalid trainer name '4 Aurven'...");
    const result = await validateDeckListAction("4 Aurven");
    console.log("Validation Result:", JSON.stringify(result, null, 2));
    
    if (!result.isValid && result.errors.some(e => e.includes('Card not found: "Aurven"'))) {
        console.log("SUCCESS: '4 Aurven' was correctly rejected.");
    } else {
        console.log("FAILURE: '4 Aurven' was NOT correctly rejected.");
    }
}

test().catch(console.error);
