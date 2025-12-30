-- Add unique_key_field_id column to stage_form_attach_rules
-- This field stores the ID of the form field to use as unique key for retrieving existing records
ALTER TABLE "stage_form_attach_rules" ADD COLUMN "unique_key_field_id" VARCHAR(255);
