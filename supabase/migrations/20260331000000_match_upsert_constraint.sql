-- DB-001: Add composite UNIQUE constraint for delta upsert match sync
-- Enables ON CONFLICT upsert on (tournament_id, round_number, table_number, division)
-- Applied to production: 2026-03-31

-- Step 1: Deduplicate any existing violations (keeps one per group)
DELETE FROM matches a USING matches b
WHERE a.tournament_id = b.tournament_id
  AND a.round_number = b.round_number
  AND a.table_number = b.table_number
  AND a.division = b.division
  AND a.id < b.id;

-- Step 2: Create composite unique constraint
ALTER TABLE matches
  ADD CONSTRAINT idx_match_unique_identifier
  UNIQUE (tournament_id, round_number, table_number, division);
