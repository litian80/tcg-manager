-- Hotfix to allow admins to edit their own profile fields
-- This replaces the existing trigger function with one that checks for admin role.

CREATE OR REPLACE FUNCTION prevent_sensitive_updates()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
BEGIN
  -- 1. Check if the user executing the action (auth.uid()) is an Admin.
  --    If YES, allow the update immediately (RETURN NEW).
  --    We query the profiles table to check the role of the current user.
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin') THEN
    RETURN NEW;
  END IF;

  -- 2. Existing Logic for Standard Users:
  --    If attempting to change locked fields from non-null to different value -> Raise Error.

  -- Check Pokemon Player ID
  IF OLD.pokemon_player_id IS NOT NULL 
     AND NEW.pokemon_player_id IS DISTINCT FROM OLD.pokemon_player_id THEN
     RAISE EXCEPTION 'Pokemon Player ID cannot be changed once set. Contact Admin.';
  END IF;

  -- Check Birth Year
  IF OLD.birth_year IS NOT NULL 
     AND NEW.birth_year IS DISTINCT FROM OLD.birth_year THEN
     RAISE EXCEPTION 'Birth Year cannot be changed once set. Contact Admin.';
  END IF;

  RETURN NEW;
END;
$$;
