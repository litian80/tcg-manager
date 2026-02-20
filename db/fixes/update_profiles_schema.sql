-- 1. Add Columns
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS first_name TEXT,
ADD COLUMN IF NOT EXISTS last_name TEXT,
ADD COLUMN IF NOT EXISTS middle_name TEXT,
ADD COLUMN IF NOT EXISTS nick_name TEXT,
ADD COLUMN IF NOT EXISTS pokemon_player_id TEXT,
ADD COLUMN IF NOT EXISTS birth_year INTEGER,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Add Unique Index on pokemon_player_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'profiles_pokemon_player_id_key'
        AND n.nspname = 'public'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_pokemon_player_id_key UNIQUE (pokemon_player_id);
    END IF;
END
$$;

-- 2. Implement "Write-Once" Logic (Trigger)
CREATE OR REPLACE FUNCTION prevent_sensitive_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- Check Pokemon Player ID
  IF OLD.pokemon_player_id IS NOT NULL 
     AND NEW.pokemon_player_id IS DISTINCT FROM OLD.pokemon_player_id THEN
     RAISE EXCEPTION 'Pokemon Player ID cannot be changed once set. Contact Admin.';
  END IF;

  -- Check Birth Year
  IF OLD.birth_year IS NOT NULL 
     AND NEW.birth_year IS DISTINCT FROM OLD.birth_year THEN
     RAISE EXCEPTION 'Birth Year cannot be changed once set. Contact Admin.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create the Trigger
DROP TRIGGER IF EXISTS check_sensitive_updates ON profiles;
CREATE TRIGGER check_sensitive_updates
BEFORE UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION prevent_sensitive_updates();
