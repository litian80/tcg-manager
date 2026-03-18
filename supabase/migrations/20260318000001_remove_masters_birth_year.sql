-- Migration: Remove masters_birth_year_min from tournaments table
-- Masters birth year is now derived from the seniors threshold.

ALTER TABLE tournaments DROP COLUMN IF EXISTS masters_birth_year_min;
