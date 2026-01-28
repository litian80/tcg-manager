-- Ensure RLS is enabled
ALTER TABLE tournament_judges ENABLE ROW LEVEL SECURITY;

-- Policy: Organizers can view judges for their tournaments
CREATE POLICY "Organizers can view judges"
ON tournament_judges
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = tournament_judges.tournament_id
    AND (
        t.organizer_popid IN (SELECT pokemon_player_id FROM profiles WHERE id = auth.uid())
        OR 
        EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
  )
);

-- Policy: Organizers can insert judges (assuming they can, though actions.ts might handle it via admin or user)
-- The user reported "after adding judge... can see entry", so INSERT works. 
-- Likely a public INSERT policy exists or the user is admin?
-- We'll add this just in case for consistency, if it doesn't exist.
-- IF NOT EXISTS isn't standard in policy creation without DO block, so we'll risk duplication error if we push?
-- Supabase `db push` is usually smart but `CREATE POLICY` might fail if exists.
-- Better to use a DO block or just assume we need it if missing.
-- I'll wrap in DO block for safety.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'tournament_judges' 
        AND policyname = 'Organizers can manage judges'
    ) THEN
        CREATE POLICY "Organizers can manage judges"
        ON tournament_judges
        FOR ALL
        TO authenticated
        USING (
            EXISTS (
                SELECT 1 FROM tournaments t
                WHERE t.id = tournament_judges.tournament_id
                AND (
                    t.organizer_popid IN (SELECT pokemon_player_id FROM profiles WHERE id = auth.uid())
                    OR 
                    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
                )
            )
        );
    END IF;
END
$$;
