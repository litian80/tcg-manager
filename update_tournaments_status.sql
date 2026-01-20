ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS status text DEFAULT 'running';
