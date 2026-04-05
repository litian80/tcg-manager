-- Add payment_provider column to tournaments to support Stripe vs Generic webhooks
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS payment_provider TEXT DEFAULT 'stripe'
  CHECK (payment_provider IN ('stripe', 'generic'));
