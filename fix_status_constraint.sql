-- Step 1: Drop the old constraint FIRST so we can update the values
ALTER TABLE tournaments DROP CONSTRAINT tournaments_status_check;

-- Step 2: Update existing data to match new allowed values
UPDATE tournaments SET status = 'running' WHERE status = 'ongoing';
UPDATE tournaments SET status = 'completed' WHERE status = 'finished';

-- Step 3: Add the new constraint
ALTER TABLE tournaments ADD CONSTRAINT tournaments_status_check CHECK (status IN ('running', 'completed'));
