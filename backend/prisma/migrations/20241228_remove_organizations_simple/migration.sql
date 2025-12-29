-- Simple migration for development: Remove Organization model, change organizationId to orgId
-- WARNING: This migration will fail if tables have existing data with FK constraints
-- For production, use the full migration with data transformation

-- Drop the organizations table
DROP TABLE IF EXISTS "organizations" CASCADE;

-- Drop the enum
DROP TYPE IF EXISTS "OrganizationStatus";

-- For tables that had organizationId (UUID FK), we need to:
-- 1. Drop the column
-- 2. Add new org_id (VARCHAR) column

-- Note: If your database has data, you'll need to:
-- 1. Backup the data
-- 2. Run: npx prisma db push --force-reset
-- 3. Re-seed the data with the new schema
