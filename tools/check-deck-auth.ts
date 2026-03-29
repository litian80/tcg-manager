import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
    console.log("Checking tournament e67713d2-0a70-44f5-bbd2-03893060b22e");
    
    // Get Litian's UUID
    const { data: profile } = await supabase.from('profiles').select('id, role').eq('pokemon_player_id', '4881040').single();
    console.log("Litian profile id:", profile?.id);
    console.log("Litian profile role:", profile?.role);

    // Check tournament_judges
    const { data: judgeRecord, error: judgeError } = await supabase
        .from("tournament_judges")
        .select("*")
        .eq("tournament_id", 'e67713d2-0a70-44f5-bbd2-03893060b22e')
        .eq("user_id", profile?.id);
    
    console.log("Judge records:", judgeRecord);
    console.log("Judge error:", judgeError);

    // Check getPlayerDeckList directly for some random player
    // First, find a player in this tournament who has a deck list
    const { data: dl } = await supabase.from('deck_lists').select('player_id, raw_text').eq('tournament_id', 'e67713d2-0a70-44f5-bbd2-03893060b22e').limit(1);
    console.log("A sample decklist:", dl);
}

main().catch(console.error);
