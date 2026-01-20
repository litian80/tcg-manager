-- 1. Backfill missing profiles for existing users (Safe to re-run)
INSERT INTO public.profiles (id, email, role)
SELECT id, email, 'user'
FROM auth.users
WHERE id NOT IN (SELECT id FROM public.profiles);

-- 2. Temporarily disable the safety trigger
-- (This is necessary because there are no admins yet to authorize the change)
ALTER TABLE public.profiles DISABLE TRIGGER check_role_change;

-- 3. Update the specific user to be an admin
UPDATE public.profiles
SET role = 'admin'
WHERE email = 'litian1980@gmail.com';

-- 4. Re-enable the safety trigger
ALTER TABLE public.profiles ENABLE TRIGGER check_role_change;

-- 5. Verify the result
SELECT * FROM public.profiles WHERE email = 'litian1980@gmail.com';
