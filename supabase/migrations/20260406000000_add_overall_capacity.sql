-- ============================================================
-- Migration: Add overall tournament capacity
-- ============================================================
-- Adds a single "capacity" column (0 = unlimited) that acts as
-- a hard ceiling across all divisions combined.
-- Also fixes process_tournament_queue referencing the old
-- single payment_url column (now split per-division).
-- ============================================================

-- 1. Add the column
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS capacity INTEGER DEFAULT 0;

-- 2. Replace register_player_atomic to enforce overall + division capacity
CREATE OR REPLACE FUNCTION public.register_player_atomic(
  p_tournament_id uuid,
  p_player_id text,
  p_division text,
  p_payment_required boolean DEFAULT false,
  p_callback_token text DEFAULT NULL::text,
  p_enable_queue boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_capacity INT;          -- division capacity
  v_overall_capacity INT;  -- overall (cross-division) capacity
  v_current_count INT;     -- active in this division
  v_overall_count INT;     -- active across all divisions
  v_capacity_column TEXT;
  v_status TEXT;
  v_div_available BOOLEAN;
  v_overall_available BOOLEAN;
BEGIN
  -- 1. Lock the tournament row to prevent concurrent capacity reads
  PERFORM id FROM tournaments WHERE id = p_tournament_id FOR UPDATE;

  -- 2. Determine the capacity column based on division
  v_capacity_column := 'capacity_' || p_division || 's';

  -- 3. Read overall capacity and division capacity
  EXECUTE format(
    'SELECT COALESCE(capacity, 0), COALESCE(%I, 0) FROM tournaments WHERE id = $1',
    v_capacity_column
  ) INTO v_overall_capacity, v_capacity USING p_tournament_id;

  -- 4. Count current active registrations in this division
  SELECT COUNT(*)
  INTO v_current_count
  FROM tournament_players
  WHERE tournament_id = p_tournament_id
    AND division = p_division
    AND registration_status IN ('registered', 'checked_in');

  -- 5. Count current active registrations across ALL divisions (for overall cap)
  SELECT COUNT(*)
  INTO v_overall_count
  FROM tournament_players
  WHERE tournament_id = p_tournament_id
    AND registration_status IN ('registered', 'checked_in');

  -- 6. Determine availability (0 = unlimited for either cap)
  v_div_available := (v_capacity = 0) OR (v_current_count < v_capacity);
  v_overall_available := (v_overall_capacity = 0) OR (v_overall_count < v_overall_capacity);

  -- 7. Determine registration status
  IF p_enable_queue THEN
    v_status := 'queued';
  ELSIF v_div_available AND v_overall_available THEN
    IF p_payment_required THEN
      v_status := 'pending_payment';
    ELSE
      v_status := 'registered';
    END IF;
  ELSE
    v_status := 'waitlisted';
  END IF;

  -- 8. Check for existing registration
  DECLARE
    v_existing_status TEXT;
  BEGIN
    SELECT registration_status INTO v_existing_status
    FROM tournament_players
    WHERE tournament_id = p_tournament_id
      AND player_id = p_player_id;

    IF FOUND THEN
      IF v_existing_status NOT IN ('withdrawn', 'cancelled') THEN
        RETURN jsonb_build_object(
          'error', 'You are already registered or on the waitlist.',
          'status', v_existing_status
        );
      END IF;

      UPDATE tournament_players
      SET registration_status = v_status,
          payment_callback_token = CASE WHEN v_status = 'pending_payment' THEN p_callback_token ELSE NULL END,
          payment_pending_since = CASE WHEN v_status = 'pending_payment' THEN NOW() ELSE NULL END
      WHERE tournament_id = p_tournament_id
        AND player_id = p_player_id;
    ELSE
      INSERT INTO tournament_players (
        tournament_id,
        player_id,
        division,
        registration_status,
        payment_callback_token,
        payment_pending_since
      ) VALUES (
        p_tournament_id,
        p_player_id,
        p_division,
        v_status,
        CASE WHEN v_status = 'pending_payment' THEN p_callback_token ELSE NULL END,
        CASE WHEN v_status = 'pending_payment' THEN NOW() ELSE NULL END
      );
    END IF;
  END;

  -- 9. Return the result
  RETURN jsonb_build_object(
    'success', TRUE,
    'status', v_status,
    'current_count', v_current_count,
    'capacity', v_capacity,
    'overall_count', v_overall_count,
    'overall_capacity', v_overall_capacity
  );

EXCEPTION
  WHEN deadlock_detected THEN
    RETURN jsonb_build_object(
      'error', 'DEADLOCK_RETRY',
      'status', NULL
    );
END;
$function$;

-- 3. Fix process_tournament_queue: replace old payment_url reference
--    with per-division payment URL check
CREATE OR REPLACE FUNCTION public.process_tournament_queue(p_tournament_id uuid)
RETURNS TABLE(player_id text, division text, new_status text)
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_tourn RECORD;
  v_global_cap INT;
  v_jr_cap INT;
  v_sr_cap INT;
  v_ma_cap INT;
  v_active_global INT;
  v_active_jr INT;
  v_active_sr INT;
  v_active_ma INT;

  v_global_avail INT;
  v_avail INT;

  v_player RECORD;
  v_promoted_count INT := 0;
  v_has_payment_url BOOLEAN;
BEGIN
  SELECT * INTO v_tourn
  FROM public.tournaments
  WHERE id = p_tournament_id
  FOR UPDATE;

  IF NOT FOUND OR v_tourn.enable_queue = false OR v_tourn.queue_paused = true THEN
    RETURN;
  END IF;

  v_global_cap := COALESCE(v_tourn.capacity, 0);
  v_jr_cap := COALESCE(v_tourn.capacity_juniors, 0);
  v_sr_cap := COALESCE(v_tourn.capacity_seniors, 0);
  v_ma_cap := COALESCE(v_tourn.capacity_masters, 0);

  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE division = 'junior'),
    COUNT(*) FILTER (WHERE division = 'senior'),
    COUNT(*) FILTER (WHERE division = 'master')
  INTO v_active_global, v_active_jr, v_active_sr, v_active_ma
  FROM public.tournament_players
  WHERE tournament_id = p_tournament_id
    AND registration_status IN ('registered', 'checked_in', 'pending_payment');

  v_global_avail := CASE WHEN v_global_cap = 0 THEN 999999 ELSE v_global_cap - v_active_global END;
  IF v_global_avail <= 0 THEN RETURN; END IF;

  FOR v_player IN 
    SELECT * FROM public.tournament_players
    WHERE tournament_id = p_tournament_id
      AND registration_status = 'queued'
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
  LOOP
    IF v_player.division = 'junior' THEN
      v_avail := CASE WHEN v_jr_cap = 0 THEN 999999 ELSE v_jr_cap - v_active_jr END;
      v_has_payment_url := v_tourn.payment_url_juniors IS NOT NULL;
    ELSIF v_player.division = 'senior' THEN
      v_avail := CASE WHEN v_sr_cap = 0 THEN 999999 ELSE v_sr_cap - v_active_sr END;
      v_has_payment_url := v_tourn.payment_url_seniors IS NOT NULL;
    ELSE
      v_avail := CASE WHEN v_ma_cap = 0 THEN 999999 ELSE v_ma_cap - v_active_ma END;
      v_has_payment_url := v_tourn.payment_url_masters IS NOT NULL;
    END IF;

    IF v_global_avail > 0 AND v_avail > 0 THEN
      UPDATE public.tournament_players
      SET 
        registration_status = CASE WHEN v_tourn.payment_required AND v_has_payment_url THEN 'pending_payment' ELSE 'registered' END,
        queue_promoted_at = NOW(),
        payment_pending_since = CASE WHEN v_tourn.payment_required AND v_has_payment_url THEN NOW() ELSE NULL END
      WHERE tournament_id = p_tournament_id AND player_id = v_player.player_id;

      v_global_avail := v_global_avail - 1;
      IF v_player.division = 'junior' THEN v_active_jr := v_active_jr + 1;
      ELSIF v_player.division = 'senior' THEN v_active_sr := v_active_sr + 1;
      ELSE v_active_ma := v_active_ma + 1;
      END IF;

      player_id := v_player.player_id;
      division := v_player.division;
      new_status := CASE WHEN v_tourn.payment_required AND v_has_payment_url THEN 'pending_payment' ELSE 'registered' END;
      RETURN NEXT;

      v_promoted_count := v_promoted_count + 1;
      IF v_promoted_count >= v_tourn.queue_batch_size THEN
        EXIT;
      END IF;
    END IF;

  END LOOP;
  
  RETURN;
END;
$function$;
