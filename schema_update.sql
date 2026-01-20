-- Add outcome column to matches table
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS outcome INTEGER DEFAULT 0;

-- Optional: Add index on outcome for filtering
CREATE INDEX IF NOT EXISTS idx_matches_outcome ON public.matches(outcome);
