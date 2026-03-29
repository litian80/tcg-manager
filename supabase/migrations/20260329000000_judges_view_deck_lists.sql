-- Migration: Allow assigned judges to view deck lists
-- Fixes: Judges see "No deck" for all players because RLS on deck_lists
-- only grants SELECT to players (own), organizers, and admins — not judges.

-- Allow assigned judges to view deck lists for their tournaments
DROP POLICY IF EXISTS "Assigned judges can view deck lists" ON public.deck_lists;
CREATE POLICY "Assigned judges can view deck lists"
ON public.deck_lists FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.tournament_judges tj
    WHERE tj.tournament_id = deck_lists.tournament_id
    AND tj.user_id = auth.uid()
  )
);

-- Also allow judges to view deck_list_cards (the individual cards)
DROP POLICY IF EXISTS "Assigned judges can view deck list cards" ON public.deck_list_cards;
CREATE POLICY "Assigned judges can view deck list cards"
ON public.deck_list_cards FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.deck_lists dl
    JOIN public.tournament_judges tj ON tj.tournament_id = dl.tournament_id
    WHERE dl.id = deck_list_cards.deck_list_id
    AND tj.user_id = auth.uid()
  )
);
