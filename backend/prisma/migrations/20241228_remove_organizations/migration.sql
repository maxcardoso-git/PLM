-- Remove Organization table and change organizationId (UUID FK) to orgId (VARCHAR)
-- This migration removes the organizations table and replaces all organizationId foreign keys
-- with a simple orgId string field

-- Step 1: Drop foreign key constraints on organizationId columns
ALTER TABLE "pipelines" DROP CONSTRAINT IF EXISTS "pipelines_organization_id_fkey";
ALTER TABLE "cards" DROP CONSTRAINT IF EXISTS "cards_organization_id_fkey";
ALTER TABLE "automation_bindings" DROP CONSTRAINT IF EXISTS "automation_bindings_organization_id_fkey";
ALTER TABLE "outbox_events" DROP CONSTRAINT IF EXISTS "outbox_events_organization_id_fkey";
ALTER TABLE "form_definitions" DROP CONSTRAINT IF EXISTS "form_definitions_organization_id_fkey";

-- Step 2: Drop indexes related to organizationId
DROP INDEX IF EXISTS "pipelines_organization_id_idx";
DROP INDEX IF EXISTS "cards_organization_id_idx";
DROP INDEX IF EXISTS "automation_bindings_organization_id_idx";
DROP INDEX IF EXISTS "outbox_events_organization_id_idx";
DROP INDEX IF EXISTS "form_definitions_organization_id_idx";

-- Step 3: Add new org_id columns (VARCHAR(100))
-- We'll temporarily add new columns, then copy data, then drop old columns

-- Pipelines
ALTER TABLE "pipelines" ADD COLUMN "org_id" VARCHAR(100);
UPDATE "pipelines" SET "org_id" = COALESCE(
  (SELECT code FROM organizations WHERE organizations.id = pipelines.organization_id),
  pipelines.organization_id::text
);
ALTER TABLE "pipelines" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "pipelines" DROP COLUMN "organization_id";

-- Cards
ALTER TABLE "cards" ADD COLUMN "org_id" VARCHAR(100);
UPDATE "cards" SET "org_id" = COALESCE(
  (SELECT code FROM organizations WHERE organizations.id = cards.organization_id),
  cards.organization_id::text
);
ALTER TABLE "cards" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "cards" DROP COLUMN "organization_id";

-- Automation Bindings
ALTER TABLE "automation_bindings" ADD COLUMN "org_id" VARCHAR(100);
UPDATE "automation_bindings" SET "org_id" = COALESCE(
  (SELECT code FROM organizations WHERE organizations.id = automation_bindings.organization_id),
  automation_bindings.organization_id::text
);
ALTER TABLE "automation_bindings" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "automation_bindings" DROP COLUMN "organization_id";

-- Outbox Events
ALTER TABLE "outbox_events" ADD COLUMN "org_id" VARCHAR(100);
UPDATE "outbox_events" SET "org_id" = COALESCE(
  (SELECT code FROM organizations WHERE organizations.id = outbox_events.organization_id),
  outbox_events.organization_id::text
);
ALTER TABLE "outbox_events" ALTER COLUMN "org_id" SET NOT NULL;
ALTER TABLE "outbox_events" DROP COLUMN "organization_id";

-- Form Definitions (orgId is nullable here)
ALTER TABLE "form_definitions" ADD COLUMN "org_id" VARCHAR(100);
UPDATE "form_definitions" SET "org_id" = COALESCE(
  (SELECT code FROM organizations WHERE organizations.id = form_definitions.organization_id),
  form_definitions.organization_id::text
) WHERE form_definitions.organization_id IS NOT NULL;
ALTER TABLE "form_definitions" DROP COLUMN "organization_id";

-- Step 4: Create new indexes for org_id
CREATE INDEX "pipelines_org_id_idx" ON "pipelines"("org_id");
CREATE INDEX "cards_org_id_idx" ON "cards"("org_id");
CREATE INDEX "automation_bindings_org_id_idx" ON "automation_bindings"("org_id");
CREATE INDEX "outbox_events_org_id_idx" ON "outbox_events"("org_id");
CREATE INDEX "form_definitions_org_id_idx" ON "form_definitions"("org_id");

-- Step 5: Update unique constraints
-- Drop old unique constraint and create new one for pipelines
ALTER TABLE "pipelines" DROP CONSTRAINT IF EXISTS "uq_pipeline_key_org";
ALTER TABLE "pipelines" ADD CONSTRAINT "uq_pipeline_key_org" UNIQUE ("tenant_id", "org_id", "key");

-- Drop old unique constraint and create new one for form_definitions
ALTER TABLE "form_definitions" DROP CONSTRAINT IF EXISTS "uq_form_definition_version";
ALTER TABLE "form_definitions" ADD CONSTRAINT "uq_form_definition_version" UNIQUE ("tenant_id", "org_id", "name", "version");

-- Step 6: Drop the organizations table and enum
DROP TABLE IF EXISTS "organizations";
DROP TYPE IF EXISTS "OrganizationStatus";
