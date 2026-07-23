-- SEC-007: Lock down profiles SELECT to prevent mass PII exposure
--
-- BEFORE: profiles had a SELECT policy `USING (true)` with no role restriction,
--   so the `anon` role (the public anon key is shipped in the client bundle)
--   could read EVERY user's email, full name, birth_year and pokemon_player_id.
--   Because this app serves Pokémon TCG Junior/Senior divisions, that exposed
--   minors' names + birth years + emails to any anonymous visitor.
--
-- AFTER: a row can be read only by:
--   * its owner (auth.uid() = id), or
--   * staff (admin/organizer), who legitimately need to search all players for
--     roster building, judge assignment, reports and user management.
--   The `anon` role loses SELECT entirely (no public/anonymous code path reads
--   profiles — player names on public pages come from the `players` table).
--
-- Verified: every cross-user profiles read in the app (roster search, staff
-- search, judge lookup, admin user list) runs through the RLS-bound client and
-- is a staff-only flow, so this policy preserves all existing functionality
-- while closing the anonymous + regular-user read holes.

-- ============================================================
-- 1. SECURITY DEFINER helper to test staff membership
--    Running as definer bypasses RLS on profiles, which avoids
--    the "infinite recursion detected in policy" error you get
--    when a profiles policy sub-queries profiles directly.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('admin', 'organizer')
  );
$$;

REVOKE ALL ON FUNCTION public.is_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;

-- ============================================================
-- 2. Drop the permissive public-read policies
--    (both historical names have shipped to prod)
-- ============================================================
DROP POLICY IF EXISTS "Public Read Profile" ON public.profiles;
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;

-- ============================================================
-- 3. Restrictive SELECT policy: self OR staff, authenticated only
-- ============================================================
DROP POLICY IF EXISTS "Profiles readable by self or staff" ON public.profiles;
CREATE POLICY "Profiles readable by self or staff"
  ON public.profiles
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = id
    OR public.is_staff()
  );
