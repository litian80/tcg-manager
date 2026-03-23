-- Migration to add secondary_category to cards table
-- Description: Adds a Secondary Category (e.g., Supporter, Item, Stadium, Tool) to distinguish types of Trainer cards.

ALTER TABLE "public"."cards" ADD COLUMN "secondary_category" text;
