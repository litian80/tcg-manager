
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

async function verifyAll() {
    console.log("Starting Verification of Database Fixes...\n");

    const { data: profiles, error: fetchError } = await supabase
        .from('profiles')
        .select('id, role')
        .limit(1);

    if (fetchError || !profiles || profiles.length === 0) {
        console.error("❌ Could not fetch profiles to test:", fetchError);
        return;
    }

    const user = profiles[0];
    console.log(`Using User ID: ${user.id} (Current Role: ${user.role})`);

    // TEST 1: Role Update (Fix for P0001)
    console.log("\n🧪 Test 1: Verifying Role Update (fix_rbac_trigger.sql)...");

    const tempRole = user.role === 'user' ? 'organizer' : 'user';
    console.log(`Attempting to change role to '${tempRole}' using Service Role...`);

    const { error: roleError } = await supabase
        .from('profiles')
        .update({ role: tempRole })
        .eq('id', user.id);

    if (roleError) {
        console.error("❌ Test 1 FAILED. Update blocked:", roleError.message);
    } else {
        console.log("✅ Test 1 PASSED. Service role update allowed (Trigger 'prevent_role_change_non_admin' is fixed).");

        // Cleanup
        await supabase.from('profiles').update({ role: user.role }).eq('id', user.id);
        console.log("   (Reverted role change)");
    }

    // RLS Policies Check (Indirect)
    // We can't easily test RLS policies without logging in as the user, 
    // but if the queries above worked (as service role), at least the DB is reachable.
    console.log("\nℹ️  Note: Please verify 'Organizer Tournament List' manually in the UI as the final check.");
}

verifyAll();
