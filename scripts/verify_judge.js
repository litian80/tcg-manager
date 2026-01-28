
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const path = require('path');

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function verifyJudge() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase credentials in .env.local');
        // Try standard keys if local logic differs, but usually these are needed.
        // Ensure the user has SUPABASE_SERVICE_ROLE_KEY in .env.local
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('--- Searching for Profile ---');
    const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .ilike('first_name', '%Xiaolei%')
        .ilike('last_name', '%Jin%');

    if (profileError) {
        console.error('Error fetching profile:', profileError);
        return;
    }

    console.log('Found Profiles:', profiles);

    if (!profiles || profiles.length === 0) {
        console.log('No profile found for Xiaolei Jin');
        return;
    }

    const userId = profiles[0].id;

    console.log('--- Checking Tournament Judges ---');
    const { data: judges, error: judgeError } = await supabase
        .from('tournament_judges')
        .select('*')
        .eq('user_id', userId);

    if (judgeError) {
        console.error('Error fetching judges:', judgeError);
        return;
    }

    console.log('Tournament Judge Entries:', judges);

    if (judges.length > 0) {
        console.log('--- Checking Tournament Details ---');
        const tournamentId = judges[0].tournament_id;
        const { data: tournament } = await supabase.from('tournaments').select('*').eq('id', tournamentId).single();
        console.log('Tournament:', tournament);
    }

}

verifyJudge();
