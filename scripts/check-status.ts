import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function main() {
    const { data: t, error } = await supabase.from('tournaments')
        .select('id, name, status, total_rounds')
        .eq('id', 'e67713d2-0a70-44f5-bbd2-03893060b22e')
        .single();
    
    if (error) console.error("Error:", error);
    else console.log("Tournament:", t);

    const { count } = await supabase.from('matches').select('*', { count: 'exact', head: true }).eq('tournament_id', 'e67713d2-0a70-44f5-bbd2-03893060b22e');
    console.log("Matches Count:", count);
}

main();
