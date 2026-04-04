-- 1. Add queue columns to tournaments
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS enable_queue BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS queue_promotion_window_minutes INTEGER DEFAULT 10,
  ADD COLUMN IF NOT EXISTS queue_batch_size INTEGER DEFAULT 15,
  ADD COLUMN IF NOT EXISTS queue_paused BOOLEAN DEFAULT false;

-- 2. Add queue timing to tournament_players
ALTER TABLE public.tournament_players
  ADD COLUMN IF NOT EXISTS queue_promoted_at TIMESTAMPTZ;

-- 3. Update registration_status check constraint to include 'queued'
ALTER TABLE public.tournament_players DROP CONSTRAINT IF EXISTS tournament_players_registration_status_check;
ALTER TABLE public.tournament_players ADD CONSTRAINT tournament_players_registration_status_check
  CHECK (registration_status = ANY (ARRAY[
    'registered'::text, 'waitlisted'::text, 'checked_in'::text,
    'withdrawn'::text, 'cancelled'::text, 'pending_payment'::text,
    'queued'::text
  ]));

-- 4. Create processed_payment_webhooks Idempotency Table
CREATE TABLE IF NOT EXISTS public.processed_payment_webhooks (
  webhook_id TEXT NOT NULL,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  player_id TEXT NOT NULL, 
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (webhook_id, tournament_id, player_id)
);

ALTER TABLE public.processed_payment_webhooks ENABLE ROW LEVEL SECURITY;

-- 5. Force UNIQUE constraint on (tournament_id, player_id)
CREATE UNIQUE INDEX IF NOT EXISTS idx_tournament_players_unique_player 
ON public.tournament_players (tournament_id, player_id);

-- 6. Update pg_cron scheduling to check every minute for queue drops
SELECT cron.unschedule('expire-pending-payments');
SELECT cron.schedule(
  'expire-pending-payments',
  '* * * * *',
  $$
    UPDATE public.tournament_players tp
    SET registration_status = 'cancelled',
        payment_callback_token = NULL,
        payment_pending_since = NULL
    FROM public.tournaments t
    WHERE tp.tournament_id = t.id 
      AND (
        (tp.registration_status = 'pending_payment' AND tp.payment_pending_since < NOW() - INTERVAL '24 hours')
        OR
        (t.enable_queue = true AND tp.registration_status = 'pending_payment' AND tp.queue_promoted_at IS NOT NULL AND tp.queue_promoted_at < NOW() - (t.queue_promotion_window_minutes * INTERVAL '1 minute'))
      );
  $$
);

-- 7. Create safe queue processing RPC with transactional locks
-- TODO [REG-004/EC-11]: This function uses the global tournament.payment_required flag
-- to determine if promoted players need pending_payment status. When division-specific
-- pricing is active and a division's fee is $0/null, the player should skip payment.
-- Update this logic to read fee_juniors/fee_seniors/fee_masters per division when
-- the queue system (REG-003) is fully activated.
CREATE OR REPLACE FUNCTION public.process_tournament_queue(p_tournament_id UUID)
RETURNS TABLE (
  player_id TEXT,
  division TEXT,
  new_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
BEGIN
  -- Strict Top-Down Locking: Lock the tournament row first
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

  -- Count active participants per division (blocking writes temporarily due to snapshot)
  SELECT 
    COUNT(*),
    COUNT(*) FILTER (WHERE division = 'junior'),
    COUNT(*) FILTER (WHERE division = 'senior'),
    COUNT(*) FILTER (WHERE division = 'master')
  INTO v_active_global, v_active_jr, v_active_sr, v_active_ma
  FROM public.tournament_players
  WHERE tournament_id = p_tournament_id
    AND registration_status IN ('registered', 'checked_in', 'pending_payment');

  -- Available slots
  v_global_avail := CASE WHEN v_global_cap = 0 THEN 999999 ELSE v_global_cap - v_active_global END;
  IF v_global_avail <= 0 THEN RETURN; END IF;

  -- Select queued players sequentially across all divisions
  FOR v_player IN 
    SELECT * FROM public.tournament_players
    WHERE tournament_id = p_tournament_id
      AND registration_status = 'queued'
    ORDER BY created_at ASC
    FOR UPDATE SKIP LOCKED
  LOOP
    -- Calculate specific division availability
    IF v_player.division = 'junior' THEN
      v_avail := CASE WHEN v_jr_cap = 0 THEN 999999 ELSE v_jr_cap - v_active_jr END;
    ELSIF v_player.division = 'senior' THEN
      v_avail := CASE WHEN v_sr_cap = 0 THEN 999999 ELSE v_sr_cap - v_active_sr END;
    ELSE
      v_avail := CASE WHEN v_ma_cap = 0 THEN 999999 ELSE v_ma_cap - v_active_ma END;
    END IF;

    -- If room globally and divisionally
    IF v_global_avail > 0 AND v_avail > 0 THEN
      -- Promote!
      UPDATE public.tournament_players
      SET 
        registration_status = CASE WHEN v_tourn.payment_required AND v_tourn.payment_url IS NOT NULL THEN 'pending_payment' ELSE 'registered' END,
        queue_promoted_at = NOW(),
        payment_pending_since = CASE WHEN v_tourn.payment_required AND v_tourn.payment_url IS NOT NULL THEN NOW() ELSE NULL END
      WHERE tournament_id = p_tournament_id AND player_id = v_player.player_id;

      -- Update internal trackers
      v_global_avail := v_global_avail - 1;
      IF v_player.division = 'junior' THEN v_active_jr := v_active_jr + 1;
      ELSIF v_player.division = 'senior' THEN v_active_sr := v_active_sr + 1;
      ELSE v_active_ma := v_active_ma + 1;
      END IF;

      -- Return promoted player info so API can dispatch webhooks
      player_id := v_player.player_id;
      division := v_player.division;
      new_status := CASE WHEN v_tourn.payment_required AND v_tourn.payment_url IS NOT NULL THEN 'pending_payment' ELSE 'registered' END;
      RETURN NEXT;

      v_promoted_count := v_promoted_count + 1;
      IF v_promoted_count >= v_tourn.queue_batch_size THEN
        EXIT; -- Stop at batch limit
      END IF;
    END IF;

  END LOOP;
  
  RETURN;
END;
$$;
