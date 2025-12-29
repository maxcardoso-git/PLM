-- Add code column to organizations table
ALTER TABLE "organizations" ADD COLUMN "code" VARCHAR(100);

-- Update existing rows to use id as code (temporary)
UPDATE "organizations" SET "code" = SUBSTRING("id"::text, 1, 8) WHERE "code" IS NULL;

-- Make code NOT NULL
ALTER TABLE "organizations" ALTER COLUMN "code" SET NOT NULL;

-- Add unique constraint
CREATE UNIQUE INDEX "uq_organization_code" ON "organizations"("tenant_id", "code");
