const { Client } = require('pg');

const connStr = `postgres://postgres.gtngekazgdqhexqxjyna:VR$42nutito@aws-0-ap-south-1.pooler.supabase.com:6543/postgres`;

async function tryConnect() {
    console.log(`Trying ap-south-1...`);
    const client = new Client({ connectionString: connStr });

    try {
        await client.connect();
        console.log(`Connected successfully to ap-south-1!`);

        console.log("Dropping foreign key constraint players_tournament_id_fkey...");
        await client.query(`ALTER TABLE public.players DROP CONSTRAINT IF EXISTS players_tournament_id_fkey;`);
        console.log("Constraint dropped.");

        console.log("Dropping column tournament_id from players table...");
        await client.query(`ALTER TABLE public.players DROP COLUMN IF EXISTS tournament_id;`);
        console.log("Column dropped successfully.");

    } catch (e) {
        console.error(`Failed ap-south-1:`, e);
    } finally {
        try { await client.end(); } catch (ignore) { }
        console.log("Finished executing script.");
    }
}

tryConnect();
