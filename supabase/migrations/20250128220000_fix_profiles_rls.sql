
-- Enable RLS on profiles if not already enabled (idempotent usually, or use DO block)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users (or public) to read profiles. 
-- Essential for Organizers to see Judge names and for players to see opponents.
-- Using DO block to avoid error if policy exists.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'profiles' 
        AND policyname = 'Public profiles are viewable by everyone'
    ) THEN
        CREATE POLICY "Public profiles are viewable by everyone" 
        ON profiles FOR SELECT 
        USING (true);
    END IF;
END
$$;
