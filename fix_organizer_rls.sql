-- 1. Enable RLS on tournaments table
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

-- 2. Create Policy for Organizers
-- Allows authenticated users to see tournaments where the organizer_popid matches their profile's pokemon_player_id
CREATE POLICY "Organizers can view their own tournaments"
ON tournaments FOR SELECT
TO authenticated
USING (
  organizer_popid IN (
    SELECT pokemon_player_id FROM profiles WHERE id = auth.uid()
  )
);

-- 3. Create Policy for Admins
-- Ensures Admins can still view all tournaments
CREATE POLICY "Admins can view all tournaments"
ON tournaments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);
