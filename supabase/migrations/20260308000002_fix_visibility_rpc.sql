-- Fix Visibility Rules for Player Registration

-- Update the `get_visible_tournaments` RPC to include tournaments where Registration is Open,
-- even if they are not fully "published" yet.

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
        -- 5. Player sees tournaments they are in (checking tournament_players index)
        (
            requesting_user_pid IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM public.tournament_players tp
                WHERE tp.tournament_id = t.id
                AND tp.player_id = requesting_user_pid
            )
        )
        OR
        -- 6. Judge sees tournaments they are assigned to (within 15 days window)
        (
            requesting_user_role = 'judge' AND
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
