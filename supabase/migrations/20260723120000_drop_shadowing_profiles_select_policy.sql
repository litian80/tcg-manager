-- SEC-007 follow-up: remove the permissive SELECT policy that shadows the
-- self-or-staff restriction on profiles.
--
-- A July 2026 audit found TWO live SELECT policies on public.profiles:
--   * "Authenticated users can read profiles"  USING (true)
--       ← from SEC-011 (Apr 2026); applied to prod but never committed as a
--         migration (repo/prod drift).
--   * "Profiles readable by self or staff"      USING (auth.uid() = id OR is_staff())
--       ← from 20260723000000_sec_profiles_pii_lockdown.sql
--
-- RLS OR-combines permissive policies, so the USING(true) policy fully shadowed
-- the stricter one — any authenticated user could still read EVERY profile row
-- (email, birth_year included). Dropping it leaves only the self-or-staff policy.
--
-- (The critical anonymous-read issue was already closed: both policies are
-- TO authenticated, so the anon role reads nothing either way.)

DROP POLICY IF EXISTS "Authenticated users can read profiles" ON public.profiles;
