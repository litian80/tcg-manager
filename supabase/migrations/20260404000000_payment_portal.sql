-- Enable pg_cron extension for scheduled jobs
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 1. Add payment columns to tournaments
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS payment_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_url TEXT,
  ADD COLUMN IF NOT EXISTS payment_webhook_secret TEXT;

-- 2. Drop legacy unused column
ALTER TABLE public.tournaments DROP COLUMN IF EXISTS use_payment_processor;

-- 3. Add payment tracking columns to tournament_players
ALTER TABLE public.tournament_players
  ADD COLUMN IF NOT EXISTS payment_callback_token TEXT,
  ADD COLUMN IF NOT EXISTS payment_pending_since TIMESTAMPTZ;

-- 4. Update registration_status check constraint to include pending_payment
ALTER TABLE public.tournament_players DROP CONSTRAINT IF EXISTS tournament_players_registration_status_check;
ALTER TABLE public.tournament_players ADD CONSTRAINT tournament_players_registration_status_check
  CHECK (registration_status = ANY (ARRAY[
    'registered'::text, 'waitlisted'::text, 'checked_in'::text,
    'withdrawn'::text, 'cancelled'::text, 'pending_payment'::text
  ]));

-- 5. Schedule payment expiry cron job (runs hourly, cancels pending_payment older than 24h)
SELECT cron.schedule(
  'expire-pending-payments',
  '0 * * * *',
  $$
    UPDATE public.tournament_players
    SET registration_status = 'cancelled',
        payment_callback_token = NULL,
        payment_pending_since = NULL
    WHERE registration_status = 'pending_payment'
      AND payment_pending_since < NOW() - INTERVAL '24 hours';
  $$
);
