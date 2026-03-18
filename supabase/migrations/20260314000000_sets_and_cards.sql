-- Migration: Create Sets and Cards Tables

-- 1. Create sets table
CREATE TABLE IF NOT EXISTS public.sets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    release_date TEXT,
    card_count INTEGER,
    era TEXT,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Enable RLS for sets
ALTER TABLE public.sets ENABLE ROW LEVEL SECURITY;

-- Policy: Public can view sets
DROP POLICY IF EXISTS "Public can view sets" ON public.sets;
CREATE POLICY "Public can view sets" 
ON public.sets FOR SELECT TO public 
USING (true);

-- Policy: Authenticated admins can insert/update sets
DROP POLICY IF EXISTS "Admins can manage sets" ON public.sets;
CREATE POLICY "Admins can manage sets" 
ON public.sets FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
);


-- 2. Create cards table
CREATE TABLE IF NOT EXISTS public.cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    set_id UUID NOT NULL REFERENCES public.sets(id) ON DELETE CASCADE,
    card_number INTEGER NOT NULL,
    name TEXT,
    primary_category TEXT,
    regulation_mark TEXT,
    image_url TEXT,
    image_status INTEGER,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(set_id, card_number)
);

-- Enable RLS for cards
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

-- Policy: Public can view cards
DROP POLICY IF EXISTS "Public can view cards" ON public.cards;
CREATE POLICY "Public can view cards" 
ON public.cards FOR SELECT TO public 
USING (true);

-- Policy: Authenticated admins can insert/update cards
DROP POLICY IF EXISTS "Admins can manage cards" ON public.cards;
CREATE POLICY "Admins can manage cards" 
ON public.cards FOR ALL TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
    AND p.role = 'admin'
  )
);
