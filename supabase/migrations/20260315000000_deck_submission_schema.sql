-- Migration: Deck Submission Module
-- Description: Adds tables for deck list storage and validation, and tournament configurations.

-- 1. Add deck submission config to tournaments
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS requires_deck_list BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS deck_list_submission_deadline TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS deck_size INTEGER DEFAULT 60,
ADD COLUMN IF NOT EXISTS sideboard_size INTEGER DEFAULT 0;

-- 2. Create deck_lists table
-- Links to tournament_players (registration) via composite key (tournament_id, player_id)
CREATE TABLE IF NOT EXISTS public.deck_lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL,
    player_id TEXT NOT NULL,
    raw_text TEXT NOT NULL,
    validation_status TEXT DEFAULT 'pending',
    validation_errors JSONB,
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    FOREIGN KEY (tournament_id, player_id) REFERENCES public.tournament_players(tournament_id, player_id) ON DELETE CASCADE,
    UNIQUE(tournament_id, player_id),
    CONSTRAINT check_validation_status CHECK (validation_status IN ('pending', 'valid', 'invalid', 'under_review'))
);

-- 3. Create deck_list_cards junction table
-- Stores the individual cards within a submitted deck list
CREATE TABLE IF NOT EXISTS public.deck_list_cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deck_list_id UUID NOT NULL REFERENCES public.deck_lists(id) ON DELETE CASCADE,
    card_id UUID NOT NULL REFERENCES public.cards(id) ON DELETE CASCADE,
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    category TEXT CHECK (category IN ('main', 'sideboard')) DEFAULT 'main',
    UNIQUE(deck_list_id, card_id, category)
);

-- 4. Create performance indexes
CREATE INDEX IF NOT EXISTS idx_deck_lists_tournament_player ON public.deck_lists(tournament_id, player_id);
CREATE INDEX IF NOT EXISTS idx_deck_list_cards_deck_list ON public.deck_list_cards(deck_list_id);
CREATE INDEX IF NOT EXISTS idx_deck_list_cards_card ON public.deck_list_cards(card_id);
CREATE INDEX IF NOT EXISTS idx_tournaments_deck_req ON public.tournaments(requires_deck_list) WHERE requires_deck_list = true;

-- 5. Enable RLS
ALTER TABLE public.deck_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deck_list_cards ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies for deck_lists
-- Players can view their own deck lists
DROP POLICY IF EXISTS "Players can view their own deck lists" ON public.deck_lists;
CREATE POLICY "Players can view their own deck lists" 
ON public.deck_lists FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.pokemon_player_id = deck_lists.player_id
  )
);

-- Players can insert/update their own deck lists
DROP POLICY IF EXISTS "Players can submit their own deck lists" ON public.deck_lists;
CREATE POLICY "Players can submit their own deck lists" 
ON public.deck_lists FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.pokemon_player_id = deck_lists.player_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.pokemon_player_id = deck_lists.player_id
  )
);

-- Organizers/Admins can view all deck lists in their tournaments
DROP POLICY IF EXISTS "Organizers can view deck lists" ON public.deck_lists;
CREATE POLICY "Organizers can view deck lists" 
ON public.deck_lists FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    JOIN public.profiles p ON p.pokemon_player_id = t.organizer_popid
    WHERE t.id = deck_lists.tournament_id
    AND p.id = auth.uid()
  )
  OR
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
);

-- 7. RLS Policies for deck_list_cards
DROP POLICY IF EXISTS "Deck list cards inherit visibility from deck lists" ON public.deck_list_cards;
CREATE POLICY "Deck list cards inherit visibility from deck lists"
ON public.deck_list_cards FOR SELECT TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.deck_lists dl
    WHERE dl.id = deck_list_cards.deck_list_id
    AND (
      -- Player owns the deck list
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.pokemon_player_id = dl.player_id
      )
      OR
      -- Organizer of the tournament
      EXISTS (
        SELECT 1 FROM public.tournaments t
        JOIN public.profiles p ON p.pokemon_player_id = t.organizer_popid
        WHERE t.id = dl.tournament_id
        AND p.id = auth.uid()
      )
      OR
      -- Admin
      EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid()
        AND p.role = 'admin'
      )
    )
  )
);

-- Players can modify their own deck list cards
DROP POLICY IF EXISTS "Players can modify their own deck list cards" ON public.deck_list_cards;
CREATE POLICY "Players can modify their own deck list cards" 
ON public.deck_list_cards FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.deck_lists dl
    JOIN public.profiles p ON p.pokemon_player_id = dl.player_id
    WHERE dl.id = deck_list_cards.deck_list_id
    AND p.id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.deck_lists dl
    JOIN public.profiles p ON p.pokemon_player_id = dl.player_id
    WHERE dl.id = deck_list_cards.deck_list_id
    AND p.id = auth.uid()
  )
);

-- Standard practice: grant to authenticated
GRANT ALL ON public.deck_lists TO authenticated;
GRANT ALL ON public.deck_list_cards TO authenticated;
