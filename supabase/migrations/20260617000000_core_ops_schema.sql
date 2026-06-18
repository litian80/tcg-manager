-- Core Ops Module: Schema and engine_type column
-- Creates the core_ops schema with tables for round management,
-- standing snapshots, pairing history, and bracket matches.
-- Also adds engine_type to public.tournaments.

-- ============================================================
-- 1. Add engine_type to public.tournaments
-- ============================================================
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS engine_type TEXT DEFAULT 'TOM'
CHECK (engine_type IN ('TOM', 'BUILT_IN'));

-- ============================================================
-- 2. Create core_ops schema
-- ============================================================
CREATE SCHEMA IF NOT EXISTS core_ops;

-- ============================================================
-- 3. Round tracking with state machine
-- ============================================================
CREATE TABLE IF NOT EXISTS core_ops.rounds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'PAIRING_GENERATED'
        CHECK (status IN ('PAIRING_GENERATED', 'ACTIVE', 'FINALIZING', 'FINISHED')),
    pairing_version INTEGER NOT NULL DEFAULT 1,
    pairings_status TEXT NOT NULL DEFAULT 'CURRENT'
        CHECK (pairings_status IN ('CURRENT', 'STALE', 'GENERATING')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (tournament_id, round_number)
);

-- ============================================================
-- 4. Frozen standings after each round
-- ============================================================
CREATE TABLE IF NOT EXISTS core_ops.standing_snapshots (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    player_id TEXT NOT NULL,  -- pokemon_player_id / tom_player_id
    rank INTEGER NOT NULL,
    match_points INTEGER NOT NULL,
    mwp NUMERIC(5,4) NOT NULL,
    omwp NUMERIC(5,4) NOT NULL,
    oomwp NUMERIC(5,4) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast standings lookup
CREATE INDEX IF NOT EXISTS idx_standing_snapshots_lookup
ON core_ops.standing_snapshots (tournament_id, round_number);

-- ============================================================
-- 5. Pairing history for rematch exclusion
-- ============================================================
CREATE TABLE IF NOT EXISTS core_ops.pairing_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    player1_id TEXT NOT NULL,  -- lower POP ID first (canonical ordering)
    player2_id TEXT NOT NULL,  -- higher POP ID
    UNIQUE (tournament_id, round_number, player1_id, player2_id)
);

-- ============================================================
-- 6. Single Elimination bracket
-- ============================================================
CREATE TABLE IF NOT EXISTS core_ops.brackets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
    type TEXT NOT NULL DEFAULT 'SINGLE_ELIM' CHECK (type IN ('SINGLE_ELIM')),
    top_cut_size INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. Bracket match tree
-- ============================================================
CREATE TABLE IF NOT EXISTS core_ops.bracket_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bracket_id UUID NOT NULL REFERENCES core_ops.brackets(id) ON DELETE CASCADE,
    bracket_round INTEGER NOT NULL,       -- 1=QF, 2=SF, 3=F (for top 8)
    bracket_position INTEGER NOT NULL,    -- position within the round (0-indexed)
    player1_id TEXT,                       -- pokemon_player_id (null until seeded/advanced)
    player2_id TEXT,
    winner_id TEXT,
    outcome INTEGER,                      -- same TOM codes: 0,1,2,3
    is_finished BOOLEAN DEFAULT FALSE,
    feeds_winner_to UUID REFERENCES core_ops.bracket_matches(id),
    UNIQUE (bracket_id, bracket_round, bracket_position)
);

-- ============================================================
-- 8. RLS: core_ops tables accessible only via service role
-- ============================================================
-- All core_ops writes happen through adminClient (service role)
-- in server actions, matching the SEC-007 pattern used by
-- match-reporting and judge actions.
ALTER TABLE core_ops.rounds ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_ops.standing_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_ops.pairing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_ops.brackets ENABLE ROW LEVEL SECURITY;
ALTER TABLE core_ops.bracket_matches ENABLE ROW LEVEL SECURITY;

-- Public read access (standings and brackets are publicly viewable)
CREATE POLICY "Public can view rounds" ON core_ops.rounds FOR SELECT USING (true);
CREATE POLICY "Public can view standings" ON core_ops.standing_snapshots FOR SELECT USING (true);
CREATE POLICY "Public can view pairing history" ON core_ops.pairing_history FOR SELECT USING (true);
CREATE POLICY "Public can view brackets" ON core_ops.brackets FOR SELECT USING (true);
CREATE POLICY "Public can view bracket matches" ON core_ops.bracket_matches FOR SELECT USING (true);

-- Write access restricted to service role (handled by adminClient in server actions)
-- No authenticated INSERT/UPDATE/DELETE policies needed — all writes go through
-- createAdminClient() which bypasses RLS, matching SEC-007 pattern.
