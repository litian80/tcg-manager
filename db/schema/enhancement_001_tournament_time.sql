-- SQL Migration: Add start_time and deck_submission_cutoff_hours to tournaments
ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS start_time TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS deck_submission_cutoff_hours INTEGER DEFAULT 1;

-- If we want to be thorough, we can also add a constraint to ensure cutoff is non-negative
ALTER TABLE tournaments
  ADD CONSTRAINT deck_submission_cutoff_hours_non_negative CHECK (deck_submission_cutoff_hours >= 0);

-- Note: We are not removing the existing 'date' column yet to maintain backward compatibility
-- and because it's used in some existing logic that expects a DATE type.
