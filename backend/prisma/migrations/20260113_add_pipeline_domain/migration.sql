-- Add domain fields to pipelines table for Orchestrator integration
ALTER TABLE "pipelines" ADD COLUMN IF NOT EXISTS "domain" VARCHAR(100);
ALTER TABLE "pipelines" ADD COLUMN IF NOT EXISTS "domain_description" TEXT;

-- Add index for domain column
CREATE INDEX IF NOT EXISTS "pipelines_domain_idx" ON "pipelines"("domain");
