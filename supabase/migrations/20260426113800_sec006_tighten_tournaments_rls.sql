-- SEC-006: Tighten tournaments INSERT/UPDATE RLS policies
-- Reviewed by DeepSeek V4 Pro (April 26, 2026)

-- ============================================================
-- PHASE 0: Harden profiles self-update (pre-requisite)
-- Prevents role self-escalation which would bypass all RLS
-- ============================================================
DROP POLICY IF EXISTS "Self Update" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM profiles WHERE id = auth.uid())
  );

-- ============================================================
-- PHASE 1: Drop permissive tournament policies
-- ============================================================
DROP POLICY IF EXISTS "Authenticated can insert tournaments" ON tournaments;
DROP POLICY IF EXISTS "Authenticated can update tournaments" ON tournaments;

-- ============================================================
-- PHASE 2: INSERT — admin or organizer (organizers must own)
-- ============================================================
CREATE POLICY "Admins and organizers can insert tournaments"
  ON tournaments FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'admin'
        OR (
          profiles.role = 'organizer'
          AND profiles.pokemon_player_id = tournaments.organizer_popid
        )
      )
    )
  );

-- ============================================================
-- PHASE 3: UPDATE — owner or admin (WITH CHECK prevents transfer)
-- ============================================================
CREATE POLICY "Owner or admin can update tournaments"
  ON tournaments FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'admin'
        OR (
          profiles.role = 'organizer'
          AND profiles.pokemon_player_id = tournaments.organizer_popid
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND (
        profiles.role = 'admin'
        OR (
          profiles.role = 'organizer'
          AND profiles.pokemon_player_id = tournaments.organizer_popid
        )
      )
    )
  );
