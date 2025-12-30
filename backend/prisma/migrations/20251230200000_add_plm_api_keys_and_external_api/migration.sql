-- Add external_api to MoveReason enum
ALTER TYPE "MoveReason" ADD VALUE IF NOT EXISTS 'external_api';

-- Add key field to stages table
ALTER TABLE "stages" ADD COLUMN IF NOT EXISTS "key" VARCHAR(100);

-- Add sessionId field to cards table
ALTER TABLE "cards" ADD COLUMN IF NOT EXISTS "session_id" VARCHAR(255);

-- Create unique index for sessionId per pipeline
CREATE UNIQUE INDEX IF NOT EXISTS "cards_pipeline_id_session_id_key" ON "cards"("pipeline_id", "session_id") WHERE "session_id" IS NOT NULL;

-- CreateTable
CREATE TABLE IF NOT EXISTS "plm_api_keys" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "key" VARCHAR(64) NOT NULL,
    "description" TEXT,
    "permissions" VARCHAR(50)[],
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "expires_at" TIMESTAMPTZ,
    "last_used_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "plm_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "plm_api_keys_key_key" ON "plm_api_keys"("key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "plm_api_keys_tenant_id_idx" ON "plm_api_keys"("tenant_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "plm_api_keys_org_id_idx" ON "plm_api_keys"("org_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "plm_api_keys_key_idx" ON "plm_api_keys"("key");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "plm_api_keys_enabled_idx" ON "plm_api_keys"("enabled");

-- AddForeignKey
ALTER TABLE "plm_api_keys" DROP CONSTRAINT IF EXISTS "plm_api_keys_tenant_id_fkey";
ALTER TABLE "plm_api_keys" ADD CONSTRAINT "plm_api_keys_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
