import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Checking tournament:", 'e67713d2-0a70-44f5-bbd2-03893060b22e');
    const { data: tData } = await supabase.from('tournaments')
        .select('organizer_popid, id').eq('id', 'e67713d2-0a70-44f5-bbd2-03893060b22e').single();
    
    console.log("Tournament data:", tData);

    const { data: pData } = await supabase.from('profiles')
        .select('*').eq('pokemon_player_id', '4881040');
    console.log("Litian profile data:", pData);
}

main().catch(console.error);
