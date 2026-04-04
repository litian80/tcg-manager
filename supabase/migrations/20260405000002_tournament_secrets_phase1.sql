-- SEC-003 Phase 1: Create tournament_secrets table with restricted RLS
-- This table isolates webhook secrets from the publicly-readable tournaments table.
-- Old columns in tournaments are kept for backward compatibility during phased migration.

-- 1. Create the restricted secrets table
CREATE TABLE IF NOT EXISTS tournament_secrets (
    tournament_id UUID PRIMARY KEY REFERENCES tournaments(id) ON DELETE CASCADE,
    notification_webhook_url TEXT,
    notification_webhook_secret TEXT,
    payment_webhook_secret TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Copy existing secrets from tournaments to tournament_secrets
INSERT INTO tournament_secrets (
    tournament_id,
    notification_webhook_url,
    notification_webhook_secret,
    payment_webhook_secret
)
SELECT
    id,
    notification_webhook_url,
    notification_webhook_secret,
    payment_webhook_secret
FROM tournaments
WHERE notification_webhook_url IS NOT NULL
   OR notification_webhook_secret IS NOT NULL
   OR payment_webhook_secret IS NOT NULL
ON CONFLICT (tournament_id) DO NOTHING;

-- 3. Enable RLS on the new table
ALTER TABLE tournament_secrets ENABLE ROW LEVEL SECURITY;

-- 4. RLS Policies — STRICT: Only admins and the tournament organizer can access secrets

-- Admin full access
CREATE POLICY "Admins can manage tournament_secrets"
ON tournament_secrets
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'admin'
    )
);

-- Organizer can read/write their own tournament's secrets
CREATE POLICY "Organizer can manage own tournament_secrets"
ON tournament_secrets
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM tournaments t
        JOIN profiles p ON p.id = auth.uid()
        WHERE t.id = tournament_secrets.tournament_id
        AND t.organizer_popid = p.pokemon_player_id
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM tournaments t
        JOIN profiles p ON p.id = auth.uid()
        WHERE t.id = tournament_secrets.tournament_id
        AND t.organizer_popid = p.pokemon_player_id
    )
);

-- Service role always has access (bypasses RLS), so webhook dispatchers using admin clients are fine.
