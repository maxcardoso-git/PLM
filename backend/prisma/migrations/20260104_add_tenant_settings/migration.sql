-- CreateTable
CREATE TABLE "tenant_settings" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "external_forms_base_url" VARCHAR(500),
    "external_forms_list_endpoint" VARCHAR(255),
    "external_forms_schema_endpoint" VARCHAR(255),
    "external_forms_data_endpoint" VARCHAR(255),
    "external_forms_api_key" VARCHAR(500),
    "external_forms_enabled" BOOLEAN NOT NULL DEFAULT false,
    "external_projects_base_url" VARCHAR(500),
    "external_projects_list_endpoint" VARCHAR(255),
    "external_projects_api_key" VARCHAR(500),
    "external_projects_enabled" BOOLEAN NOT NULL DEFAULT false,
    "api_keys_service_base_url" VARCHAR(500),
    "api_keys_service_list_endpoint" VARCHAR(255),
    "api_keys_service_api_key" VARCHAR(500),
    "api_keys_service_enabled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenant_settings_tenant_id_key" ON "tenant_settings"("tenant_id");
