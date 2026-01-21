-- Create tournament_judges table
CREATE TABLE IF NOT EXISTS public.tournament_judges (
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (tournament_id, user_id)
);

-- Enable RLS
ALTER TABLE public.tournament_judges ENABLE ROW LEVEL SECURITY;

-- Policies

-- Policy to allow INSERT/DELETE if auth.uid() is the Tournament Organizer OR role = 'admin'
-- Note: "Tournament Organizer" implies checking the `tournaments` table for the `organizer_popid`? 
-- The requirement says "Allow INSERT/DELETE if auth.uid() is the Tournament Organizer". 
-- BUT `tournaments` table has `organizer_popid` (string), not a UUID link to `profiles`.
-- The prompt for API Logic says: "IF user.role === 'organizer' AND user.pokemon_player_id === xml.popid".
-- So linking "Tournament Organizer" to `auth.uid()` requires joining `profiles` to match `pokemon_player_id` with `tournaments.organizer_popid`.

-- Let's construct the check.
-- Admin check is easy: exists(select 1 from profiles where id = auth.uid() and role = 'admin')
-- Organizer check: 
-- The user must be the organizer OF THE TOURNAMENT.
-- tournament_id is in the row being inserted/deleted.
-- We need to check if the `tournaments` row with that `id` has an `organizer_popid` that matches the `pokemon_player_id` of the `auth.uid()`.

create policy "Allow organizer or admin to insert judges"
on public.tournament_judges
for insert
with check (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
  OR
  exists (
    select 1 from public.tournaments t
    join public.profiles p on p.id = auth.uid()
    where t.id = tournament_judges.tournament_id
    and t.organizer_popid = p.pokemon_player_id
    and p.role = 'organizer' -- Optional redundancy if strict adherence to prompt "OR role = 'admin'" implies others must be organizers? Prompt says "IF user.role === 'organizer' AND ...".
  )
);

create policy "Allow organizer or admin to delete judges"
on public.tournament_judges
for delete
using (
  exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  )
  OR
  exists (
    select 1 from public.tournaments t
    join public.profiles p on p.id = auth.uid()
    where t.id = tournament_judges.tournament_id
    and t.organizer_popid = p.pokemon_player_id
  )
);

-- Allow SELECT for everyone
create policy "Allow everyone to view judges"
on public.tournament_judges
for select
using (true);
