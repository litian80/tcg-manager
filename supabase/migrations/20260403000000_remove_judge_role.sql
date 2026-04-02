-- ============================================================
-- Migration: Remove 'judge' from app_role enum
-- Judge is now purely a tournament-level assignment via 
-- tournament_judges table, not a user-level role.
-- ============================================================

-- ============================================================
-- STEP 0: Disable the role-change guard trigger
-- ============================================================
DROP TRIGGER IF EXISTS check_role_change ON public.profiles;

-- ============================================================
-- STEP 1: Migrate existing 'judge' users to 'user'
-- ============================================================
UPDATE public.profiles SET role = 'user' WHERE role = 'judge';

-- ============================================================
-- STEP 2: Drop ALL policies that reference app_role
-- (Postgres won't let us alter the enum while policies depend on it)
-- ============================================================

-- profiles
DROP POLICY IF EXISTS "Admin Update" ON public.profiles;

-- tournament_judges  
DROP POLICY IF EXISTS "Allow organizer or admin to insert judges" ON public.tournament_judges;
DROP POLICY IF EXISTS "Allow organizer or admin to delete judges" ON public.tournament_judges;
DROP POLICY IF EXISTS "Organizers can manage judges" ON public.tournament_judges;
DROP POLICY IF EXISTS "Organizers can view judges" ON public.tournament_judges;

-- tournaments
DROP POLICY IF EXISTS "Admins can delete tournaments" ON public.tournaments;
DROP POLICY IF EXISTS "Admins can view all tournaments" ON public.tournaments;

-- matches
DROP POLICY IF EXISTS "Admins can delete matches" ON public.matches;

-- players
DROP POLICY IF EXISTS "Admins can delete players" ON public.players;

-- tournament_players
DROP POLICY IF EXISTS "Admins can delete tournament_players" ON public.tournament_players;

-- player_penalties
DROP POLICY IF EXISTS "Judges and Organizers can insert penalties" ON public.player_penalties;
DROP POLICY IF EXISTS "Judges and Organizers can view penalties" ON public.player_penalties;
DROP POLICY IF EXISTS "Organizers and Admins can update penalties" ON public.player_penalties;
DROP POLICY IF EXISTS "Organizers and Admins can delete penalties" ON public.player_penalties;

-- deck_checks
DROP POLICY IF EXISTS "Judges and Organizers can insert deck checks" ON public.deck_checks;
DROP POLICY IF EXISTS "Judges and Organizers can view deck checks" ON public.deck_checks;

-- deck_lists
DROP POLICY IF EXISTS "Organizers can view deck lists" ON public.deck_lists;

-- deck_list_cards
DROP POLICY IF EXISTS "Deck list cards inherit visibility from deck lists" ON public.deck_list_cards;

-- cards
DROP POLICY IF EXISTS "Admins can manage cards" ON public.cards;

-- sets
DROP POLICY IF EXISTS "Admins can manage sets" ON public.sets;

-- ============================================================
-- STEP 3: Drop the get_visible_tournaments function (depends on app_role)
-- ============================================================
DROP FUNCTION IF EXISTS public.get_visible_tournaments(UUID, TEXT, public.app_role);

-- ============================================================
-- STEP 4: Recreate the enum without 'judge'
-- ============================================================
ALTER TYPE public.app_role RENAME TO app_role_old;
CREATE TYPE public.app_role AS ENUM ('admin', 'organizer', 'user');

ALTER TABLE public.profiles
  ALTER COLUMN role DROP DEFAULT;
ALTER TABLE public.profiles
  ALTER COLUMN role TYPE public.app_role USING role::text::public.app_role;
ALTER TABLE public.profiles
  ALTER COLUMN role SET DEFAULT 'user';

DROP TYPE public.app_role_old;

-- ============================================================
-- STEP 5: Re-enable the role-change guard trigger
-- ============================================================
CREATE TRIGGER check_role_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_change_non_admin();

-- ============================================================
-- STEP 6: Recreate ALL policies (identical to before)
-- ============================================================

-- profiles: Admin Update
CREATE POLICY "Admin Update" ON public.profiles FOR UPDATE TO public
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- tournament_judges: allow insert
CREATE POLICY "Allow organizer or admin to insert judges"
ON public.tournament_judges FOR INSERT TO public
WITH CHECK (
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  OR
  (EXISTS (
    SELECT 1 FROM public.tournaments t
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE t.id = tournament_judges.tournament_id
    AND t.organizer_popid = p.pokemon_player_id
    AND p.role = 'organizer'
  ))
);

-- tournament_judges: allow delete
CREATE POLICY "Allow organizer or admin to delete judges"
ON public.tournament_judges FOR DELETE TO public
USING (
  (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'))
  OR
  (EXISTS (
    SELECT 1 FROM public.tournaments t
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE t.id = tournament_judges.tournament_id
    AND t.organizer_popid = p.pokemon_player_id
  ))
);

-- tournament_judges: organizers can manage
CREATE POLICY "Organizers can manage judges"
ON public.tournament_judges FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_judges.tournament_id
    AND (
      t.organizer_popid IN (SELECT pokemon_player_id FROM public.profiles WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
  )
);

-- tournament_judges: organizers can view
CREATE POLICY "Organizers can view judges"
ON public.tournament_judges FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_judges.tournament_id
    AND (
      t.organizer_popid IN (SELECT pokemon_player_id FROM public.profiles WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
  )
);

-- tournaments: admins can delete
CREATE POLICY "Admins can delete tournaments"
ON public.tournaments FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- tournaments: admins can view all
CREATE POLICY "Admins can view all tournaments"
ON public.tournaments FOR SELECT TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- matches: admins can delete
CREATE POLICY "Admins can delete matches"
ON public.matches FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- players: admins can delete
CREATE POLICY "Admins can delete players"
ON public.players FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- tournament_players: admins can delete
CREATE POLICY "Admins can delete tournament_players"
ON public.tournament_players FOR DELETE TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- player_penalties: judges and organizers can insert
CREATE POLICY "Judges and Organizers can insert penalties"
ON public.player_penalties FOR INSERT TO authenticated
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.tournament_judges tj
    WHERE tj.tournament_id = player_penalties.tournament_id AND tj.user_id = auth.uid()
  ))
  OR
  (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = player_penalties.tournament_id
    AND (
      t.organizer_popid IN (SELECT pokemon_player_id FROM public.profiles WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
  ))
);

-- player_penalties: judges and organizers can view
CREATE POLICY "Judges and Organizers can view penalties"
ON public.player_penalties FOR SELECT TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM public.tournament_judges tj
    WHERE tj.tournament_id = player_penalties.tournament_id AND tj.user_id = auth.uid()
  ))
  OR
  (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = player_penalties.tournament_id
    AND (
      t.organizer_popid IN (SELECT pokemon_player_id FROM public.profiles WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
  ))
);

-- player_penalties: organizers and admins can update
CREATE POLICY "Organizers and Admins can update penalties"
ON public.player_penalties FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = player_penalties.tournament_id
    AND (
      t.organizer_popid IN (SELECT pokemon_player_id FROM public.profiles WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = player_penalties.tournament_id
    AND (
      t.organizer_popid IN (SELECT pokemon_player_id FROM public.profiles WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
  )
);

-- player_penalties: organizers and admins can delete
CREATE POLICY "Organizers and Admins can delete penalties"
ON public.player_penalties FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = player_penalties.tournament_id
    AND (
      t.organizer_popid IN (SELECT pokemon_player_id FROM public.profiles WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
  )
);

-- deck_checks: judges and organizers can insert
CREATE POLICY "Judges and Organizers can insert deck checks"
ON public.deck_checks FOR INSERT TO authenticated
WITH CHECK (
  (EXISTS (
    SELECT 1 FROM public.tournament_judges tj
    WHERE tj.tournament_id = deck_checks.tournament_id AND tj.user_id = auth.uid()
  ))
  OR
  (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = deck_checks.tournament_id
    AND (
      t.organizer_popid IN (SELECT pokemon_player_id FROM public.profiles WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
  ))
);

-- deck_checks: judges and organizers can view
CREATE POLICY "Judges and Organizers can view deck checks"
ON public.deck_checks FOR SELECT TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM public.tournament_judges tj
    WHERE tj.tournament_id = deck_checks.tournament_id AND tj.user_id = auth.uid()
  ))
  OR
  (EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = deck_checks.tournament_id
    AND (
      t.organizer_popid IN (SELECT pokemon_player_id FROM public.profiles WHERE id = auth.uid())
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
  ))
);

-- deck_lists: organizers can view
CREATE POLICY "Organizers can view deck lists"
ON public.deck_lists FOR SELECT TO authenticated
USING (
  (EXISTS (
    SELECT 1 FROM public.tournaments t
    JOIN public.profiles p ON p.pokemon_player_id = t.organizer_popid
    WHERE t.id = deck_lists.tournament_id AND p.id = auth.uid()
  ))
  OR
  (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'))
);

-- deck_list_cards: inherit visibility
CREATE POLICY "Deck list cards inherit visibility from deck lists"
ON public.deck_list_cards FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deck_lists dl
    WHERE dl.id = deck_list_cards.deck_list_id
    AND (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.pokemon_player_id = dl.player_id)
      OR EXISTS (
        SELECT 1 FROM public.tournaments t
        JOIN public.profiles p ON p.pokemon_player_id = t.organizer_popid
        WHERE t.id = dl.tournament_id AND p.id = auth.uid()
      )
      OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
    )
  )
);

-- cards: admins can manage
CREATE POLICY "Admins can manage cards"
ON public.cards FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- sets: admins can manage
CREATE POLICY "Admins can manage sets"
ON public.sets FOR ALL TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin')
);

-- ============================================================
-- STEP 7: Recreate get_visible_tournaments with assignment-based 
-- judge check (works for any role, not just role='judge')
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_visible_tournaments(
    requesting_user_id UUID,
    requesting_user_pid TEXT,
    requesting_user_role public.app_role
)
RETURNS SETOF public.tournaments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT t.*
    FROM public.tournaments t
    WHERE
        -- 1. Admin sees everything
        (requesting_user_role = 'admin')
        OR
        -- 2. Published is visible to everyone
        (t.is_published = true)
        OR
        -- 3. Registration Open is visible to everyone
        (t.registration_open = true)
        OR
        -- 4. Organizer sees their own tournaments
        (requesting_user_role = 'organizer' AND t.organizer_popid = requesting_user_pid)
        OR
        -- 5. Player sees tournaments they are in
        (
            requesting_user_pid IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM public.tournament_players tp
                WHERE tp.tournament_id = t.id
                AND tp.player_id = requesting_user_pid
            )
        )
        OR
        -- 6. Judge assignment check (any role, assignment-based)
        (
            requesting_user_id IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM public.tournament_judges tj
                WHERE tj.tournament_id = t.id
                AND tj.user_id = requesting_user_id
            )
            AND
            (t.date::DATE >= (CURRENT_DATE - INTERVAL '15 days'))
        );
END;
$$;
