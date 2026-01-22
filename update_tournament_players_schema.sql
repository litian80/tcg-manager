-- Add Standings columns to tournament_players
ALTER TABLE tournament_players 
ADD COLUMN IF NOT EXISTS rank INTEGER,
ADD COLUMN IF NOT EXISTS division TEXT,
ADD COLUMN IF NOT EXISTS wins INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS losses INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ties INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0;

-- Optional: Create an index for faster lookups by tournament and division
CREATE INDEX IF NOT EXISTS idx_tournament_players_standings ON tournament_players(tournament_id, division, rank);
