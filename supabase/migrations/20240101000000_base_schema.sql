-- COMBINED BASE SCHEMA MIGRATION --

-- 1. RBAC SETUP (Profiles & Roles)
-- Create Enum Type
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'organizer', 'judge', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create Table profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role public.app_role NOT NULL DEFAULT 'user',
  pokemon_player_id TEXT UNIQUE,
  birth_year INTEGER,
  first_name TEXT,
  last_name TEXT,
  middle_name TEXT,
  nick_name TEXT,
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SAFETY: Ensure columns exist if table already existed without them
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pokemon_player_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birth_year INTEGER;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS middle_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS nick_name TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Ensure Unique Constraint
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'profiles_pokemon_player_id_key'
        AND n.nspname = 'public'
    ) THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_pokemon_player_id_key UNIQUE (pokemon_player_id);
    END IF;
END
$$;

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies for Profiles
DROP POLICY IF EXISTS "Public Read Profile" ON public.profiles;
CREATE POLICY "Public Read Profile" ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Self Update" ON public.profiles;
CREATE POLICY "Self Update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admin Update" ON public.profiles;
CREATE POLICY "Admin Update" ON public.profiles FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- STRICT ENFORCEMENT via Trigger
CREATE OR REPLACE FUNCTION public.prevent_role_change_non_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
      RAISE EXCEPTION 'You are not authorized to change the role field.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER check_role_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_change_non_admin();

-- Handle New User Trigger
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- 2. CORE SCHEMA (Tournaments, Players, Matches)
-- Create tournaments table
CREATE TABLE IF NOT EXISTS tournaments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    date DATE NOT NULL,
    total_rounds INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('running', 'completed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    organizer_popid TEXT -- Added to match usage in policies, though supabase_schema.sql didn't have it explicit? 
    -- WAIT: supabase_schema.sql (Step 142) did NOT have organizer_popid. 
    -- BUT judge_system.sql (Step 143) uses `t.organizer_popid`.
    -- I must add it here or it will fail later.
);
-- Adding parsed_data from hotfix immediately to avoid issues
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS parsed_data JSONB;
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS organizer_popid TEXT; -- Implicitly required by RLS

-- Create players table
CREATE TABLE IF NOT EXISTS players (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tom_player_id TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE
);

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    table_number INTEGER NOT NULL,
    player1_tom_id TEXT NOT NULL REFERENCES players(tom_player_id),
    player2_tom_id TEXT NOT NULL REFERENCES players(tom_player_id),
    winner_tom_id TEXT REFERENCES players(tom_player_id),
    is_finished BOOLEAN DEFAULT FALSE NOT NULL
);

-- Enable RLS
ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public can view tournaments" ON tournaments FOR SELECT TO public USING (true);
CREATE POLICY "Public can view players" ON players FOR SELECT TO public USING (true);
CREATE POLICY "Public can view matches" ON matches FOR SELECT TO public USING (true);

CREATE POLICY "Authenticated can insert tournaments" ON tournaments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update tournaments" ON tournaments FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can insert players" ON players FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update players" ON players FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated can insert matches" ON matches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update matches" ON matches FOR UPDATE TO authenticated USING (true);


-- 3. JUDGES SYSTEM (Tournament Judges)
CREATE TABLE IF NOT EXISTS public.tournament_judges (
    tournament_id UUID REFERENCES public.tournaments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (tournament_id, user_id)
);

ALTER TABLE public.tournament_judges ENABLE ROW LEVEL SECURITY;

-- Policies for Judges
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
    and p.role = 'organizer'
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

create policy "Allow everyone to view judges"
on public.tournament_judges
for select
using (true);
