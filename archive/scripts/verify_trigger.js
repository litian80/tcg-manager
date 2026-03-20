
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
function loadEnv() {
    const envPath = path.resolve(process.cwd(), '.env.local');
    if (!fs.existsSync(envPath)) return {};
    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};
    content.split('\n').forEach(line => {
        const [key, value] = line.split('=');
        if (key && value) env[key.trim()] = value.trim();
    });
    return env;
}

const env = loadEnv();
const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'] || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'] || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing credentials. Please check .env.local");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function verifyTrigger() {
    console.log("Verifying prevent_sensitive_updates function...");

    // We can't query pg_proc directly via Supabase client, but we can try to call an RPC or 
    // check if we can update a sensitive field as an admin (Integration Test).
    // Checking source is hard without SQL access.

    // Strategy: Try to update a profile's pokemon_player_id as a service_role (which we are).
    // Admin user ID is needed or just create a dummy one?
    // Actually, we can just grab a random user and try to update.

    // 1. Get a user profile
    const { data: profiles, error: fetchError } = await supabase
        .from('profiles')
        .select('id, pokemon_player_id, birth_year')
        .limit(1);

    if (fetchError || !profiles || profiles.length === 0) {
        console.error("Could not fetch profiles to test:", fetchError);
        return;
    }

    const user = profiles[0];
    const oldId = user.pokemon_player_id || "TEST_ID_1";
    const newId = "TEST_ID_UPDATE_" + Date.now();

    console.log(`Testing update on user ${user.id}. Changing POP ID from ${oldId} to ${newId}.`);

    // 2. Try to update using service role 
    const { error: updateError } = await supabase
        .from('profiles')
        .update({ pokemon_player_id: newId })
        .eq('id', user.id);

    if (updateError) {
        console.error("❌ Verification FAILED. Update blocked:", updateError.message);
    } else {
        console.log("✅ Verification PASSED. Service role update allowed.");
        // Revert change
        await supabase.from('profiles').update({ pokemon_player_id: user.pokemon_player_id }).eq('id', user.id);
        console.log("Reverted changes.");
    }
}

verifyTrigger();
