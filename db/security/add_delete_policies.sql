-- Migration: add_delete_policies
-- Description: Adds DELETE policies for tournaments, matches, and players to allow admins to perform deletions.
-- Required because RLS is enabled and no DELETE policies existed, blocking even cascades.

BEGIN;

-- 1. Tournaments DELETE Policy
DROP POLICY IF EXISTS "Admins can delete tournaments" ON public.tournaments;

CREATE POLICY "Admins can delete tournaments"
ON public.tournaments
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 2. Matches DELETE Policy
-- Required for CASCADE to work if RLS is checked on child tables
DROP POLICY IF EXISTS "Admins can delete matches" ON public.matches;

CREATE POLICY "Admins can delete matches"
ON public.matches
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 3. Players DELETE Policy
DROP POLICY IF EXISTS "Admins can delete players" ON public.players;

CREATE POLICY "Admins can delete players"
ON public.players
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

-- 4. Tournament Players DELETE Policy
DROP POLICY IF EXISTS "Admins can delete tournament_players" ON public.tournament_players;

CREATE POLICY "Admins can delete tournament_players"
ON public.tournament_players
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'
  )
);

COMMIT;
