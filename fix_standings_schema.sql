-- 1. Ensure table exists with correct structure (Idempotent)
CREATE TABLE IF NOT EXISTS tournament_players (
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL REFERENCES players(tom_player_id) ON DELETE CASCADE,
    rank INTEGER,
    division TEXT,
    wins INTEGER DEFAULT 0,
    losses INTEGER DEFAULT 0,
    ties INTEGER DEFAULT 0,
    points INTEGER DEFAULT 0,
    CONSTRAINT tournament_players_pkey PRIMARY KEY (tournament_id, player_id)
);

-- 2. Add Foreign Key if missing (Crucial for joins in StandingsView)
DO $$ 
BEGIN 
    -- Check if FK to players exists, if not add it
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'tournament_players_player_id_fkey'
    ) THEN 
        -- Attempt to add it. Note: This might fail if bad data exists, but we assume clean state or compatible IDs.
        -- If player_id isn't key, we add it. Note: referencing tom_player_id (TEXT).
        BEGIN
            ALTER TABLE tournament_players 
            ADD CONSTRAINT tournament_players_player_id_fkey 
            FOREIGN KEY (player_id) REFERENCES players(tom_player_id) ON DELETE CASCADE;
        EXCEPTION WHEN duplicate_object THEN 
            null; 
        END;
    END IF;
END $$;

-- 3. Enable RLS
ALTER TABLE tournament_players ENABLE ROW LEVEL SECURITY;

-- 4. Add Public Read Policy (Fixes the Fetch Error)
DROP POLICY IF EXISTS "Public can view tournament_players" ON tournament_players;
CREATE POLICY "Public can view tournament_players" ON tournament_players FOR SELECT TO public USING (true);

-- 5. Add Authenticated Write Policies (Required for Parser)
DROP POLICY IF EXISTS "Authenticated can insert tournament_players" ON tournament_players;
CREATE POLICY "Authenticated can insert tournament_players" ON tournament_players FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated can update tournament_players" ON tournament_players;
CREATE POLICY "Authenticated can update tournament_players" ON tournament_players FOR UPDATE TO authenticated USING (true);
