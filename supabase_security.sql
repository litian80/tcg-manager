-- Enable RLS on tables
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

-- Allow public read access (SELECT) for everyone (anon users)
CREATE POLICY "Public matches are viewable by everyone" ON matches
    FOR SELECT USING (true);

CREATE POLICY "Public players are viewable by everyone" ON players
    FOR SELECT USING (true);

CREATE POLICY "Public tournaments are viewable by everyone" ON tournaments
    FOR SELECT USING (true);

-- Allow authenticated users to INSERT/UPDATE/DELETE
-- Note: In a real production app, you might want to check for specific roles or emails here too
-- tailored to your "admin" logic in middleware.
-- For simple authenticated access:

CREATE POLICY "Authenticated users can modify matches" ON matches
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can modify players" ON players
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can modify tournaments" ON tournaments
    FOR ALL USING (auth.role() = 'authenticated');
