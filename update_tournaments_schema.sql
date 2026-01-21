ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS tom_uid text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS country text,
ADD COLUMN IF NOT EXISTS organizer_popid text;

-- Optional: Create a composite index for performance if these will be queried often for uniqueness
-- CREATE INDEX idx_tournaments_unique_check ON public.tournaments (tom_uid, city, country, organizer_popid, date);
