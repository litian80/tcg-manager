-- Fix for "You are not authorized to change the role field" (P0001)
-- This script patches the role change trigger to allow the 'service_role' (used by Admin Server Actions)
-- to bypass the admin check.

CREATE OR REPLACE FUNCTION public.prevent_role_change_non_admin()
RETURNS TRIGGER AS $$
BEGIN
  -- 1. Bypass for Service Role (Supabase Admin Client) checks and internal roles
  -- Check if the request is from service_role OR if the user is an admin
  IF (auth.jwt() ->> 'role') = 'service_role' THEN
      RETURN NEW;
  END IF;

  -- 2. Logic for Standard Users
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
