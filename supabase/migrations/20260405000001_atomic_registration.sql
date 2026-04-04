-- SEC-005: Atomic registration capacity check
-- Prevents TOCTOU race condition where concurrent registrations can exceed capacity limits.
-- Uses SELECT ... FOR UPDATE to lock the tournament row during capacity evaluation.

CREATE OR REPLACE FUNCTION register_player_atomic(
  p_tournament_id UUID,
  p_player_id TEXT,        -- pokemon_player_id / tom_player_id
  p_division TEXT,         -- 'junior', 'senior', 'master'
  p_payment_required BOOLEAN DEFAULT FALSE,
  p_callback_token TEXT DEFAULT NULL,
  p_enable_queue BOOLEAN DEFAULT FALSE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_capacity INT;
  v_current_count INT;
  v_capacity_column TEXT;
  v_status TEXT;
  v_available BOOLEAN;
BEGIN
  -- 1. Lock the tournament row to prevent concurrent capacity reads
  --    This serializes concurrent registration attempts for the same tournament
  PERFORM id FROM tournaments WHERE id = p_tournament_id FOR UPDATE;

  -- 2. Determine the capacity column based on division
  v_capacity_column := 'capacity_' || p_division || 's';

  -- 3. Read capacity for this division
  EXECUTE format(
    'SELECT COALESCE(%I, 0) FROM tournaments WHERE id = $1',
    v_capacity_column
  ) INTO v_capacity USING p_tournament_id;

  -- 4. Count current active registrations in this division
  SELECT COUNT(*)
  INTO v_current_count
  FROM tournament_players
  WHERE tournament_id = p_tournament_id
    AND division = p_division
    AND registration_status IN ('registered', 'checked_in');

  -- 5. Determine availability (0 capacity = unlimited)
  v_available := (v_capacity = 0) OR (v_current_count < v_capacity);

  -- 6. Determine registration status
  IF p_enable_queue THEN
    v_status := 'queued';
  ELSIF v_available THEN
    IF p_payment_required THEN
      v_status := 'pending_payment';
    ELSE
      v_status := 'registered';
    END IF;
  ELSE
    v_status := 'waitlisted';
  END IF;

  -- 7. Check for existing registration
  DECLARE
    v_existing_status TEXT;
  BEGIN
    SELECT registration_status INTO v_existing_status
    FROM tournament_players
    WHERE tournament_id = p_tournament_id
      AND player_id = p_player_id;

    IF FOUND THEN
      -- Already registered (not withdrawn/cancelled)
      IF v_existing_status NOT IN ('withdrawn', 'cancelled') THEN
        RETURN jsonb_build_object(
          'error', 'You are already registered or on the waitlist.',
          'status', v_existing_status
        );
      END IF;

      -- Re-activate a withdrawn/cancelled registration
      UPDATE tournament_players
      SET registration_status = v_status,
          payment_callback_token = CASE WHEN v_status = 'pending_payment' THEN p_callback_token ELSE NULL END,
          payment_pending_since = CASE WHEN v_status = 'pending_payment' THEN NOW() ELSE NULL END
      WHERE tournament_id = p_tournament_id
        AND player_id = p_player_id;
    ELSE
      -- Insert new registration
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

  -- 8. Return the result
  RETURN jsonb_build_object(
    'success', TRUE,
    'status', v_status,
    'current_count', v_current_count,
    'capacity', v_capacity
  );

EXCEPTION
  WHEN deadlock_detected THEN
    -- Retry hint for the application layer
    RETURN jsonb_build_object(
      'error', 'DEADLOCK_RETRY',
      'status', NULL
    );
END;
$$;

-- Grant execute to authenticated users (the function uses SECURITY DEFINER to bypass RLS)
GRANT EXECUTE ON FUNCTION register_player_atomic TO authenticated;
