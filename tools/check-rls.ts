import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Emulate the authenticated client for Litian (user 4881040, profile id: 67d6f82d-6c3d-434c-9ffa-dca792e67110)
// To do this properly, we need their access token or just look at Server Action code. Let's just create a mock authenticated request if possible, but actually we can just check if RLS allows anon access.
// Since we don't have Litian's jwt, let's just use the Admin client to see exactly what we get, and verify if it's the RLS.

const adminClient = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    // get a real player from tournament
    const { data: decklist } = await adminClient
        .from('deck_lists')
        .select('player_id, raw_text')
        .eq('tournament_id', 'e67713d2-0a70-44f5-bbd2-03893060b22e')
        .limit(1)
        .single();
    
    console.log("Admin Client Decklist:", decklist ? decklist.player_id : 'Not found');
}

main().catch(console.error);
