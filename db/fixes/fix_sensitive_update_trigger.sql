-- Fix for "Access Denied" error on Admin updates
-- This script updates the trigger function to allow 'service_role' and 'admin' users
-- to bypass the immutability checks on pokemon_player_id and birth_year.

CREATE OR REPLACE FUNCTION prevent_sensitive_updates()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow service_role (Supabase Admin) or Application Admins (checked via profiles table) to bypass
  -- We check:
  -- 1. If the request comes from the Service Role (auth.jwt -> role)
  -- 2. OR if the performing user has the 'admin' role in the profiles table
  IF (auth.jwt() ->> 'role') = 'service_role' OR 
     (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin' THEN
      RETURN NEW;
  END IF;

  -- Standard Checks for regular users:

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
$$ LANGUAGE plpgsql;
