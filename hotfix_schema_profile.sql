-- 1. Add 'parsed_data' column to tournaments
ALTER TABLE public.tournaments
ADD COLUMN IF NOT EXISTS parsed_data JSONB;

COMMENT ON COLUMN public.tournaments.parsed_data IS 'Stores structured data derived from raw_xml for indexing and querying.';

-- 2. Create Admin Bypass Function (RPC)
-- This function allows admins to update sensitive profile fields even if locked.

CREATE OR REPLACE FUNCTION admin_reset_user_profile(
    target_user_id UUID,
    new_pid TEXT DEFAULT NULL,
    new_birth_year INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with privileges of the function creator (postgres)
AS $$
DECLARE
    executing_user_role public.app_role;
BEGIN
    -- 1. Verify executed by an Admin
    SELECT role INTO executing_user_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF executing_user_role IS DISTINCT FROM 'admin' THEN
        RAISE EXCEPTION 'Access Denied: Only Admins can reset user profiles.';
    END IF;

    -- 2. Update the target profile
    -- We temporarily disable the trigger for this specific transaction/operation if possible, 
    -- OR better: we utilize the fact that we are inside a SECURITY DEFINER function 
    -- BUT the trigger 'prevent_sensitive_updates' checks 'OLD' vs 'NEW' values.
    -- The trigger raises exception if fields change. 
    
    -- Using session_replication_role to bypass triggers is risky but effectively standard for "Admin Overrides" in simple setups.
    -- However, a safer way is to modify the trigger logic to allow a specific context variable, 
    -- but since we cannot easily modify the trigger in a hotfix without replacing it entirely,
    -- let's replace the trigger function to start with, as proposed in the plan (Task 1 step 2 implicitly suggests ensuring it works).
    
    -- Actually, the prompt says "Create a function... Logic: ... allow updating... even if existing trigger usually blocks it"
    -- Since the trigger raises an exception on ANY change to non-null values, we MUST modify the trigger to allow this, 
    -- OR disable the trigger locally.
    
    -- Strat: Disable trigger for the duration of the update on this table for this transaction.
    -- Note: Requires superuser or table owner. SECURITY DEFINER usually helps here.
    
    ALTER TABLE public.profiles DISABLE TRIGGER check_sensitive_updates;
    
    UPDATE public.profiles
    SET 
        pokemon_player_id = new_pid,
        birth_year = new_birth_year,
        updated_at = NOW()
    WHERE id = target_user_id;
    
    ALTER TABLE public.profiles ENABLE TRIGGER check_sensitive_updates;

END;
$$;
