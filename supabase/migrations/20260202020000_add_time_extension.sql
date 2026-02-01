-- Add time_extension_minutes to matches
ALTER TABLE matches ADD COLUMN IF NOT EXISTS time_extension_minutes INTEGER DEFAULT 0;

-- Ensure judges can update matches (already covered by "Authenticated can update matches" policy, but clarifying logic/RLS might be needed if restricted)
-- "Authenticated can update matches" existing policy uses (true), so simple update is allowed for now.
-- In a stricter system, we'd limit this to judges, but relying on base policy for speed as confirmed in exploration.
