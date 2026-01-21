-- 1. Add is_published column to tournaments
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT true;

-- 2. Create tournament_players table
CREATE TABLE IF NOT EXISTS public.tournament_players (
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    player_id TEXT NOT NULL, -- Storing the Pokemon Player ID string
    PRIMARY KEY (tournament_id, player_id)
);

-- Index for faster lookups by player_id
CREATE INDEX IF NOT EXISTS idx_tournament_players_player_id ON public.tournament_players(player_id);

-- Enable RLS (though typically this table is just for backend lookups, good practice)
ALTER TABLE public.tournament_players ENABLE ROW LEVEL SECURITY;

-- Allow everyone to read (needed for the visibility check if running as user, although RPC handles it as Security Definer)
CREATE POLICY "Allow public read" ON public.tournament_players FOR SELECT USING (true);

-- 3. create RPC function for complex filtering
-- Dropping first to handle updates
DROP FUNCTION IF EXISTS get_visible_tournaments(UUID, TEXT, public.app_role);

CREATE OR REPLACE FUNCTION get_visible_tournaments(
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
        -- 3. Organizer sees their own tournaments
        (requesting_user_role = 'organizer' AND t.organizer_popid = requesting_user_pid)
        OR
        -- 4. Player sees tournaments they are in (checking tournament_players index)
        (
            requesting_user_pid IS NOT NULL AND
            EXISTS (
                SELECT 1 FROM public.tournament_players tp
                WHERE tp.tournament_id = t.id
                AND tp.player_id = requesting_user_pid
            )
        )
        OR
        -- 5. Judge sees tournaments they are assigned to (within 15 days window)
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
