-- Up Migration for Player Registration Features

-- 1. Add registration configuration columns to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS registration_open BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS registration_opens_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS registration_closes_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS capacity_juniors INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS capacity_seniors INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS capacity_masters INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS fee_juniors TEXT DEFAULT '0',
ADD COLUMN IF NOT EXISTS fee_seniors TEXT DEFAULT '0',
ADD COLUMN IF NOT EXISTS fee_masters TEXT DEFAULT '0',
ADD COLUMN IF NOT EXISTS juniors_birth_year_max INTEGER,
ADD COLUMN IF NOT EXISTS seniors_birth_year_max INTEGER,
ADD COLUMN IF NOT EXISTS masters_birth_year_min INTEGER,
ADD COLUMN IF NOT EXISTS use_payment_processor BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS publish_roster BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS pokemon_url TEXT,
ADD COLUMN IF NOT EXISTS details TEXT;

CREATE INDEX IF NOT EXISTS idx_tournaments_registration_open 
ON public.tournaments(registration_open) WHERE registration_open = true;

-- 2. Add registration_status to tournament_players
ALTER TABLE public.tournament_players 
ADD COLUMN IF NOT EXISTS registration_status TEXT DEFAULT 'registered';

-- Update existing rows explicitly to ensure compatibility
UPDATE public.tournament_players 
SET registration_status = 'registered' 
WHERE registration_status IS NULL;

-- Add check constraint for valid enum-like values
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'valid_registration_status' 
        AND conrelid = 'public.tournament_players'::regclass
    ) THEN
        ALTER TABLE public.tournament_players 
        ADD CONSTRAINT valid_registration_status 
        CHECK (registration_status IN ('registered', 'waitlisted', 'checked_in', 'withdrawn', 'cancelled'));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tournament_players_status 
ON public.tournament_players(tournament_id, registration_status);

-- 3. RLS Policies
ALTER TABLE public.tournament_players ENABLE ROW LEVEL SECURITY;

-- Allow public to read tournament_players
DROP POLICY IF EXISTS "Public can view tournament_players" ON public.tournament_players;
CREATE POLICY "Public can view tournament_players" 
ON public.tournament_players FOR SELECT TO public 
USING (true);

-- Allow authenticated users to insert themselves into tournament_players
DROP POLICY IF EXISTS "Players can self register" ON public.tournament_players;
CREATE POLICY "Players can self register" 
ON public.tournament_players FOR INSERT TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.pokemon_player_id = tournament_players.player_id
  )
);

-- Allow users to update their own tournament_players record (e.g. withdrawing)
DROP POLICY IF EXISTS "Players can update their own registration" ON public.tournament_players;
CREATE POLICY "Players can update their own registration" 
ON public.tournament_players FOR UPDATE TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.pokemon_player_id = tournament_players.player_id
  )
);

-- Allow organizers to insert/update their own tournament records
DROP POLICY IF EXISTS "Organizers can manage players in their tournaments" ON public.tournament_players;
CREATE POLICY "Organizers can manage players in their tournaments" 
ON public.tournament_players FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    JOIN public.profiles p ON p.pokemon_player_id = t.organizer_popid
    WHERE t.id = tournament_players.tournament_id
    AND p.id = auth.uid()
  )
);
