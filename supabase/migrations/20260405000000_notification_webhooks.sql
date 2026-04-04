-- Spec 007: Organiser Notification Webhooks
-- Add notification webhook columns to tournaments
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS notification_webhook_url TEXT,
  ADD COLUMN IF NOT EXISTS notification_webhook_secret TEXT;

-- Add deck reminder tracking to tournament_players
ALTER TABLE public.tournament_players
  ADD COLUMN IF NOT EXISTS deck_reminder_sent_at TIMESTAMPTZ;

-- Enable pg_net extension for HTTP calls from pg_cron
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule deck reminder cron (every 15 min → calls Edge Function)
SELECT cron.schedule(
  'deck-deadline-reminders',
  '*/15 * * * *',
  $$
    SELECT net.http_post(
      url := current_setting('app.settings.supabase_url') || '/functions/v1/deck-reminder',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    );
  $$
);
