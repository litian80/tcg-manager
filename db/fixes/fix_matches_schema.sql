-- Make player2_tom_id nullable to support Bye matches
ALTER TABLE matches ALTER COLUMN player2_tom_id DROP NOT NULL;
