-- Add toggle for online match reporting
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS allow_online_match_reporting BOOLEAN DEFAULT false;

-- Add tracking for player reported results
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS p1_reported_result TEXT CHECK (p1_reported_result IN ('win', 'loss', 'tie')),
ADD COLUMN IF NOT EXISTS p2_reported_result TEXT CHECK (p2_reported_result IN ('win', 'loss', 'tie'));