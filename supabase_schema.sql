-- Create tournaments table
CREATE TABLE tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    date DATE NOT NULL,
    total_rounds INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create players table
-- tom_player_id is UNIQUE as requested, which means it must be unique across ALL tournaments if strictly enforced here.
CREATE TABLE players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tom_player_id TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE
);

-- Create matches table
CREATE TABLE matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    table_number INTEGER NOT NULL,
    player1_tom_id TEXT NOT NULL REFERENCES players(tom_player_id),
    player2_tom_id TEXT NOT NULL REFERENCES players(tom_player_id),
    winner_tom_id TEXT REFERENCES players(tom_player_id),
    is_finished BOOLEAN DEFAULT FALSE NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Policies for Public Read Access
CREATE POLICY "Public can view tournaments" ON tournaments FOR SELECT TO public USING (true);
CREATE POLICY "Public can view players" ON players FOR SELECT TO public USING (true);
CREATE POLICY "Public can view matches" ON matches FOR SELECT TO public USING (true);

-- Policies for Authenticated Write Access (Insert/Update)
CREATE POLICY "Authenticated can insert tournaments" ON tournaments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update tournaments" ON tournaments FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can insert players" ON players FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update players" ON players FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can insert matches" ON matches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update matches" ON matches FOR UPDATE TO authenticated USING (true);
