-- Add created_at timestamp to tournament_players for waitlist ordering
ALTER TABLE public.tournament_players
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now() NOT NULL;
