-- Add match slip barcode key fields
ALTER TABLE public.matches
ADD COLUMN IF NOT EXISTS player1_win TEXT,
ADD COLUMN IF NOT EXISTS tie TEXT,
ADD COLUMN IF NOT EXISTS player2_win TEXT;
