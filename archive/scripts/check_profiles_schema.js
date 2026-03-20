
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkSchema() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase credentials');
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('--- Fetching one profile to check schema ---');
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching profile:', error);
        return;
    }

    if (profiles && profiles.length > 0) {
        console.log('Profile Keys:', Object.keys(profiles[0]));
        console.log('Profile Data Sample:', profiles[0]);
    } else {
        console.log('No profiles found to check schema permissions/columns.');
    }
}

checkSchema();
