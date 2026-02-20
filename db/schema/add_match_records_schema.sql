-- Add display_record columns to matches table
ALTER TABLE matches 
ADD COLUMN IF NOT EXISTS p1_display_record TEXT,
ADD COLUMN IF NOT EXISTS p2_display_record TEXT;
