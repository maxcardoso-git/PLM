-- CreateEnum
CREATE TYPE "PipelineRole" AS ENUM ('VIEWER', 'OPERATOR', 'SUPERVISOR', 'ADMIN');

-- CreateTable
CREATE TABLE "user_groups" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "org_id" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "user_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "group_members" (
    "id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "added_by" UUID,
    "added_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "group_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_permissions" (
    "id" UUID NOT NULL,
    "pipeline_id" UUID NOT NULL,
    "group_id" UUID NOT NULL,
    "role" "PipelineRole" NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pipeline_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "user_groups_tenant_id_idx" ON "user_groups"("tenant_id");

-- CreateIndex
CREATE INDEX "user_groups_org_id_idx" ON "user_groups"("org_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_user_group_name" ON "user_groups"("tenant_id", "org_id", "name");

-- CreateIndex
CREATE INDEX "group_members_group_id_idx" ON "group_members"("group_id");

-- CreateIndex
CREATE INDEX "group_members_user_id_idx" ON "group_members"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_group_member" ON "group_members"("group_id", "user_id");

-- CreateIndex
CREATE INDEX "pipeline_permissions_pipeline_id_idx" ON "pipeline_permissions"("pipeline_id");

-- CreateIndex
CREATE INDEX "pipeline_permissions_group_id_idx" ON "pipeline_permissions"("group_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_pipeline_permission" ON "pipeline_permissions"("pipeline_id", "group_id");

-- AddForeignKey
ALTER TABLE "user_groups" ADD CONSTRAINT "user_groups_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "user_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "group_members" ADD CONSTRAINT "group_members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_permissions" ADD CONSTRAINT "pipeline_permissions_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_permissions" ADD CONSTRAINT "pipeline_permissions_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "user_groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
