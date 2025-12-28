-- CreateEnum
CREATE TYPE "TenantStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "OrganizationStatus" AS ENUM ('active', 'inactive');

-- CreateEnum
CREATE TYPE "FormStatus" AS ENUM ('draft', 'published', 'archived');

-- CreateEnum
CREATE TYPE "PipelineLifecycleStatus" AS ENUM ('draft', 'test', 'published', 'closed', 'archived');

-- CreateEnum
CREATE TYPE "PipelineVersionStatus" AS ENUM ('draft', 'test', 'published', 'archived');

-- CreateEnum
CREATE TYPE "StageClassification" AS ENUM ('NOT_STARTED', 'ON_GOING', 'WAITING', 'FINISHED', 'CANCELED');

-- CreateEnum
CREATE TYPE "CardFormStatus" AS ENUM ('FILLED', 'TO_FILL', 'LOCKED');

-- CreateEnum
CREATE TYPE "CardPriority" AS ENUM ('low', 'medium', 'high', 'urgent');

-- CreateEnum
CREATE TYPE "CardStatus" AS ENUM ('active', 'closed', 'archived');

-- CreateEnum
CREATE TYPE "MoveReason" AS ENUM ('manual', 'api', 'automation');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('pending', 'sent', 'failed');

-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('PLM_PIPE_CREATED', 'PLM_PIPE_PUBLISHED', 'PLM_PIPE_CLOSED', 'PLM_CARD_CREATED', 'PLM_CARD_MOVED', 'PLM_CARD_CLOSED');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "status" "TenantStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "status" "OrganizationStatus" NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "form_definitions" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "organization_id" UUID,
    "name" VARCHAR(255) NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "schema_json" JSONB NOT NULL,
    "status" "FormStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "form_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipelines" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "key" VARCHAR(100) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "lifecycle_status" "PipelineLifecycleStatus" NOT NULL DEFAULT 'draft',
    "published_version" INTEGER,
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "pipelines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pipeline_versions" (
    "id" UUID NOT NULL,
    "pipeline_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "status" "PipelineVersionStatus" NOT NULL DEFAULT 'draft',
    "config_hash" VARCHAR(64),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "published_at" TIMESTAMPTZ,

    CONSTRAINT "pipeline_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stages" (
    "id" UUID NOT NULL,
    "pipeline_version_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "stage_order" INTEGER NOT NULL,
    "classification" "StageClassification" NOT NULL,
    "color" VARCHAR(7) NOT NULL,
    "is_initial" BOOLEAN NOT NULL DEFAULT false,
    "is_final" BOOLEAN NOT NULL DEFAULT false,
    "wip_limit" INTEGER,
    "sla_hours" INTEGER,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "stages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_transitions" (
    "id" UUID NOT NULL,
    "pipeline_version_id" UUID NOT NULL,
    "from_stage_id" UUID NOT NULL,
    "to_stage_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stage_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stage_form_attach_rules" (
    "id" UUID NOT NULL,
    "stage_id" UUID NOT NULL,
    "form_definition_id" UUID NOT NULL,
    "default_form_status" "CardFormStatus" NOT NULL DEFAULT 'TO_FILL',
    "lock_on_leave_stage" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stage_form_attach_rules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_bindings" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "pipeline_id" UUID NOT NULL,
    "event_type" "EventType" NOT NULL,
    "filter_from_stage_id" UUID,
    "filter_to_stage_id" UUID,
    "automation_plan_id" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "automation_bindings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cards" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "pipeline_id" UUID NOT NULL,
    "pipeline_version" INTEGER NOT NULL,
    "current_stage_id" UUID NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "description" TEXT,
    "priority" "CardPriority" NOT NULL DEFAULT 'medium',
    "status" "CardStatus" NOT NULL DEFAULT 'active',
    "created_by" UUID,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "closed_at" TIMESTAMPTZ,

    CONSTRAINT "cards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_forms" (
    "id" UUID NOT NULL,
    "card_id" UUID NOT NULL,
    "form_definition_id" UUID NOT NULL,
    "form_version" INTEGER NOT NULL,
    "status" "CardFormStatus" NOT NULL DEFAULT 'TO_FILL',
    "data" JSONB NOT NULL DEFAULT '{}',
    "attached_at_stage_id" UUID NOT NULL,
    "attached_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "card_forms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "card_move_history" (
    "id" UUID NOT NULL,
    "card_id" UUID NOT NULL,
    "from_stage_id" UUID NOT NULL,
    "to_stage_id" UUID NOT NULL,
    "moved_by" UUID,
    "moved_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reason" "MoveReason" NOT NULL DEFAULT 'manual',

    CONSTRAINT "card_move_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "outbox_events" (
    "id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "organization_id" UUID NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "OutboxStatus" NOT NULL DEFAULT 'pending',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ,
    "last_error" TEXT,

    CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- CreateIndex
CREATE INDEX "organizations_tenant_id_idx" ON "organizations"("tenant_id");

-- CreateIndex
CREATE INDEX "organizations_status_idx" ON "organizations"("status");

-- CreateIndex
CREATE INDEX "form_definitions_tenant_id_idx" ON "form_definitions"("tenant_id");

-- CreateIndex
CREATE INDEX "form_definitions_organization_id_idx" ON "form_definitions"("organization_id");

-- CreateIndex
CREATE INDEX "form_definitions_status_idx" ON "form_definitions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "form_definitions_tenant_id_organization_id_name_version_key" ON "form_definitions"("tenant_id", "organization_id", "name", "version");

-- CreateIndex
CREATE INDEX "pipelines_tenant_id_idx" ON "pipelines"("tenant_id");

-- CreateIndex
CREATE INDEX "pipelines_organization_id_idx" ON "pipelines"("organization_id");

-- CreateIndex
CREATE INDEX "pipelines_lifecycle_status_idx" ON "pipelines"("lifecycle_status");

-- CreateIndex
CREATE INDEX "pipelines_key_idx" ON "pipelines"("key");

-- CreateIndex
CREATE UNIQUE INDEX "pipelines_organization_id_key_key" ON "pipelines"("organization_id", "key");

-- CreateIndex
CREATE INDEX "pipeline_versions_pipeline_id_idx" ON "pipeline_versions"("pipeline_id");

-- CreateIndex
CREATE INDEX "pipeline_versions_status_idx" ON "pipeline_versions"("status");

-- CreateIndex
CREATE UNIQUE INDEX "pipeline_versions_pipeline_id_version_key" ON "pipeline_versions"("pipeline_id", "version");

-- CreateIndex
CREATE INDEX "stages_pipeline_version_id_idx" ON "stages"("pipeline_version_id");

-- CreateIndex
CREATE INDEX "stages_pipeline_version_id_stage_order_idx" ON "stages"("pipeline_version_id", "stage_order");

-- CreateIndex
CREATE INDEX "stage_transitions_pipeline_version_id_idx" ON "stage_transitions"("pipeline_version_id");

-- CreateIndex
CREATE INDEX "stage_transitions_from_stage_id_idx" ON "stage_transitions"("from_stage_id");

-- CreateIndex
CREATE INDEX "stage_transitions_to_stage_id_idx" ON "stage_transitions"("to_stage_id");

-- CreateIndex
CREATE UNIQUE INDEX "stage_transitions_from_stage_id_to_stage_id_key" ON "stage_transitions"("from_stage_id", "to_stage_id");

-- CreateIndex
CREATE INDEX "stage_form_attach_rules_stage_id_idx" ON "stage_form_attach_rules"("stage_id");

-- CreateIndex
CREATE INDEX "stage_form_attach_rules_form_definition_id_idx" ON "stage_form_attach_rules"("form_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "stage_form_attach_rules_stage_id_form_definition_id_key" ON "stage_form_attach_rules"("stage_id", "form_definition_id");

-- CreateIndex
CREATE INDEX "automation_bindings_pipeline_id_idx" ON "automation_bindings"("pipeline_id");

-- CreateIndex
CREATE INDEX "automation_bindings_event_type_idx" ON "automation_bindings"("event_type");

-- CreateIndex
CREATE INDEX "cards_tenant_id_idx" ON "cards"("tenant_id");

-- CreateIndex
CREATE INDEX "cards_organization_id_idx" ON "cards"("organization_id");

-- CreateIndex
CREATE INDEX "cards_pipeline_id_idx" ON "cards"("pipeline_id");

-- CreateIndex
CREATE INDEX "cards_current_stage_id_idx" ON "cards"("current_stage_id");

-- CreateIndex
CREATE INDEX "cards_status_idx" ON "cards"("status");

-- CreateIndex
CREATE INDEX "cards_priority_idx" ON "cards"("priority");

-- CreateIndex
CREATE INDEX "cards_created_at_idx" ON "cards"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_cards_kanban" ON "cards"("pipeline_id", "status", "current_stage_id");

-- CreateIndex
CREATE INDEX "card_forms_card_id_idx" ON "card_forms"("card_id");

-- CreateIndex
CREATE INDEX "card_forms_form_definition_id_idx" ON "card_forms"("form_definition_id");

-- CreateIndex
CREATE INDEX "card_forms_status_idx" ON "card_forms"("status");

-- CreateIndex
CREATE UNIQUE INDEX "card_forms_card_id_form_definition_id_form_version_key" ON "card_forms"("card_id", "form_definition_id", "form_version");

-- CreateIndex
CREATE INDEX "card_move_history_card_id_idx" ON "card_move_history"("card_id");

-- CreateIndex
CREATE INDEX "card_move_history_from_stage_id_idx" ON "card_move_history"("from_stage_id");

-- CreateIndex
CREATE INDEX "card_move_history_to_stage_id_idx" ON "card_move_history"("to_stage_id");

-- CreateIndex
CREATE INDEX "card_move_history_moved_at_idx" ON "card_move_history"("moved_at" DESC);

-- CreateIndex
CREATE INDEX "outbox_events_status_idx" ON "outbox_events"("status");

-- CreateIndex
CREATE INDEX "outbox_events_created_at_idx" ON "outbox_events"("created_at");

-- CreateIndex
CREATE INDEX "outbox_events_entity_type_entity_id_idx" ON "outbox_events"("entity_type", "entity_id");

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_definitions" ADD CONSTRAINT "form_definitions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "form_definitions" ADD CONSTRAINT "form_definitions_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipelines" ADD CONSTRAINT "pipelines_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pipeline_versions" ADD CONSTRAINT "pipeline_versions_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stages" ADD CONSTRAINT "stages_pipeline_version_id_fkey" FOREIGN KEY ("pipeline_version_id") REFERENCES "pipeline_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_transitions" ADD CONSTRAINT "stage_transitions_pipeline_version_id_fkey" FOREIGN KEY ("pipeline_version_id") REFERENCES "pipeline_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_transitions" ADD CONSTRAINT "stage_transitions_from_stage_id_fkey" FOREIGN KEY ("from_stage_id") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_transitions" ADD CONSTRAINT "stage_transitions_to_stage_id_fkey" FOREIGN KEY ("to_stage_id") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_form_attach_rules" ADD CONSTRAINT "stage_form_attach_rules_stage_id_fkey" FOREIGN KEY ("stage_id") REFERENCES "stages"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stage_form_attach_rules" ADD CONSTRAINT "stage_form_attach_rules_form_definition_id_fkey" FOREIGN KEY ("form_definition_id") REFERENCES "form_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_bindings" ADD CONSTRAINT "automation_bindings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_bindings" ADD CONSTRAINT "automation_bindings_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_bindings" ADD CONSTRAINT "automation_bindings_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_bindings" ADD CONSTRAINT "automation_bindings_filter_from_stage_id_fkey" FOREIGN KEY ("filter_from_stage_id") REFERENCES "stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_bindings" ADD CONSTRAINT "automation_bindings_filter_to_stage_id_fkey" FOREIGN KEY ("filter_to_stage_id") REFERENCES "stages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_pipeline_id_fkey" FOREIGN KEY ("pipeline_id") REFERENCES "pipelines"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cards" ADD CONSTRAINT "cards_current_stage_id_fkey" FOREIGN KEY ("current_stage_id") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_forms" ADD CONSTRAINT "card_forms_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_forms" ADD CONSTRAINT "card_forms_form_definition_id_fkey" FOREIGN KEY ("form_definition_id") REFERENCES "form_definitions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_forms" ADD CONSTRAINT "card_forms_attached_at_stage_id_fkey" FOREIGN KEY ("attached_at_stage_id") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_move_history" ADD CONSTRAINT "card_move_history_card_id_fkey" FOREIGN KEY ("card_id") REFERENCES "cards"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_move_history" ADD CONSTRAINT "card_move_history_from_stage_id_fkey" FOREIGN KEY ("from_stage_id") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "card_move_history" ADD CONSTRAINT "card_move_history_to_stage_id_fkey" FOREIGN KEY ("to_stage_id") REFERENCES "stages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "outbox_events" ADD CONSTRAINT "outbox_events_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
