-- 1. Create Enum Type
-- Drop if exists to ensure idempotency relative to re-runs (be careful with data loss, but for setup it's fine)
-- CREATE TYPE public.app_role AS ENUM ('admin', 'organizer', 'judge', 'user');
DO $$ BEGIN
    CREATE TYPE public.app_role AS ENUM ('admin', 'organizer', 'judge', 'user');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Create Table profiles
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  role public.app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Policy 1: Public Read Profile
DROP POLICY IF EXISTS "Public Read Profile" ON public.profiles;
CREATE POLICY "Public Read Profile" 
ON public.profiles 
FOR SELECT 
USING (true);

-- Policy 2: Self Update
DROP POLICY IF EXISTS "Self Update" ON public.profiles;
CREATE POLICY "Self Update" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = id);

-- Policy 3: Admin Update
DROP POLICY IF EXISTS "Admin Update" ON public.profiles;
CREATE POLICY "Admin Update" 
ON public.profiles 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- STRICT ENFORCEMENT for Policy 2 (Prevent role update by non-admins)
CREATE OR REPLACE FUNCTION public.prevent_role_change_non_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- If the role is being changed
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Check if the user is an admin
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
      RAISE EXCEPTION 'You are not authorized to change the role field.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER check_role_change
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_change_non_admin();

-- 5. Create Trigger for New Users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists to avoid error on multiple runs
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Optional: Insert the first admin manually if you identify them by ID or Email
-- Example:
-- UPDATE public.profiles SET role = 'admin' WHERE email = 'your-email@example.com';
