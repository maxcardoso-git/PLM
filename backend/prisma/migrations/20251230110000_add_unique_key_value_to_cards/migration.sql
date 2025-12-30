-- Add unique_key_value column to cards table
-- This field stores the value used to fetch external form data
ALTER TABLE "cards" ADD COLUMN "unique_key_value" VARCHAR(500);
