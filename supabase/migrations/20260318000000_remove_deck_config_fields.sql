-- Migration to remove redundant deck and sideboard size configuration
-- These are now hardcoded to 60 and 0 respectively in the application logic.

ALTER TABLE tournaments 
DROP COLUMN IF EXISTS deck_size,
DROP COLUMN IF EXISTS sideboard_size;
