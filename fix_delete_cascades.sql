-- Migration: fix_delete_cascades
-- Description: Drops and re-adds Foreign Key constraints to ensure ON DELETE CASCADE is enabled for all tournament-related tables.
-- This ensures that deleting a tournament also deletes all associated judges, players, and matches.

BEGIN;

-- 1. Fix tournament_judges
-- Check if the table exists first to avoid errors
DO $$ 
BEGIN 
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tournament_judges') THEN
        -- Drop existing constraint if it exists (name might vary, so we try to find it or just drop by known naming convention if standard)
        -- To be safe, we try to drop the specific constraint name if we know it, or we can use a dynamic approach.
        -- Assuming standard naming or previously created naming: tournament_judges_tournament_id_fkey
        ALTER TABLE public.tournament_judges
        DROP CONSTRAINT IF EXISTS tournament_judges_tournament_id_fkey;

        -- Re-add with CASCADE
        ALTER TABLE public.tournament_judges
        ADD CONSTRAINT tournament_judges_tournament_id_fkey
        FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 2. Fix players
-- Players belong to a tournament.
ALTER TABLE public.players
DROP CONSTRAINT IF EXISTS players_tournament_id_fkey;

ALTER TABLE public.players
ADD CONSTRAINT players_tournament_id_fkey
FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;

-- 3. Fix matches (Reference to Tournament)
ALTER TABLE public.matches
DROP CONSTRAINT IF EXISTS matches_tournament_id_fkey;

ALTER TABLE public.matches
ADD CONSTRAINT matches_tournament_id_fkey
FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;

-- 4. Fix matches (References to Players)
-- If a player is deleted (e.g. via tournament delete), the match should also be deleted (or cascaded).
-- Although deleting the tournament deletes matches directly, having this constraint prevents "update/delete on table 'players' violates foreign key constraint" 
-- if the DB tries to delete the player before the match is deleted.

-- Player 1
ALTER TABLE public.matches
DROP CONSTRAINT IF EXISTS matches_player1_tom_id_fkey;

ALTER TABLE public.matches
ADD CONSTRAINT matches_player1_tom_id_fkey
FOREIGN KEY (player1_tom_id) REFERENCES public.players(tom_player_id) ON DELETE CASCADE;

-- Player 2
ALTER TABLE public.matches
DROP CONSTRAINT IF EXISTS matches_player2_tom_id_fkey;

ALTER TABLE public.matches
ADD CONSTRAINT matches_player2_tom_id_fkey
FOREIGN KEY (player2_tom_id) REFERENCES public.players(tom_player_id) ON DELETE CASCADE;

-- Winner
ALTER TABLE public.matches
DROP CONSTRAINT IF EXISTS matches_winner_tom_id_fkey;

ALTER TABLE public.matches
ADD CONSTRAINT matches_winner_tom_id_fkey
FOREIGN KEY (winner_tom_id) REFERENCES public.players(tom_player_id) ON DELETE CASCADE;

-- 5. Fix tournament_players (Safe check)
DO $$ 
BEGIN 
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'tournament_players') THEN
        ALTER TABLE public.tournament_players
        DROP CONSTRAINT IF EXISTS tournament_players_tournament_id_fkey;

        ALTER TABLE public.tournament_players
        ADD CONSTRAINT tournament_players_tournament_id_fkey
        FOREIGN KEY (tournament_id) REFERENCES public.tournaments(id) ON DELETE CASCADE;
    END IF;
END $$;

COMMIT;
