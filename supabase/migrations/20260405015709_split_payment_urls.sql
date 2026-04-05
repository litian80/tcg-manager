-- Drop existing fee columns
ALTER TABLE public.tournaments DROP COLUMN fee_juniors;
ALTER TABLE public.tournaments DROP COLUMN fee_seniors;
ALTER TABLE public.tournaments DROP COLUMN fee_masters;

-- Rename generic payment_url to payment_url_masters specifically
ALTER TABLE public.tournaments RENAME COLUMN payment_url TO payment_url_masters;

-- Add new division-specific URLs
ALTER TABLE public.tournaments ADD COLUMN payment_url_juniors text;
ALTER TABLE public.tournaments ADD COLUMN payment_url_seniors text;
