-- =========================================================
-- PLM - Pipeline Management
-- DDL Completo - PostgreSQL 15+
-- =========================================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =========================================================
-- ENUM TYPES
-- =========================================================

CREATE TYPE tenant_status AS ENUM ('active', 'inactive');
CREATE TYPE organization_status AS ENUM ('active', 'inactive');
CREATE TYPE form_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE pipeline_lifecycle_status AS ENUM ('draft', 'test', 'published', 'closed', 'archived');
CREATE TYPE pipeline_version_status AS ENUM ('draft', 'test', 'published', 'archived');
CREATE TYPE stage_classification AS ENUM ('NOT_STARTED', 'ON_GOING', 'WAITING', 'FINISHED', 'CANCELED');
CREATE TYPE card_form_status AS ENUM ('FILLED', 'TO_FILL', 'LOCKED');
CREATE TYPE card_priority AS ENUM ('low', 'medium', 'high', 'urgent');
CREATE TYPE card_status AS ENUM ('active', 'closed', 'archived');
CREATE TYPE move_reason AS ENUM ('manual', 'api', 'automation');
CREATE TYPE outbox_status AS ENUM ('pending', 'sent', 'failed');
CREATE TYPE event_type AS ENUM (
    'PLM.PIPE.CREATED',
    'PLM.PIPE.PUBLISHED',
    'PLM.PIPE.CLOSED',
    'PLM.CARD.CREATED',
    'PLM.CARD.MOVED',
    'PLM.CARD.CLOSED'
);

-- =========================================================
-- TENANCY TABLES
-- =========================================================

CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    status tenant_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tenants_status ON tenants(status);

CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    status organization_status NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_organizations_tenant ON organizations(tenant_id);
CREATE INDEX idx_organizations_status ON organizations(status);

-- =========================================================
-- FORM DEFINITIONS
-- =========================================================

CREATE TABLE form_definitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    version INT NOT NULL DEFAULT 1,
    schema_json JSONB NOT NULL,
    status form_status NOT NULL DEFAULT 'draft',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_form_definition_version UNIQUE (tenant_id, organization_id, name, version)
);

CREATE INDEX idx_form_definitions_tenant ON form_definitions(tenant_id);
CREATE INDEX idx_form_definitions_org ON form_definitions(organization_id);
CREATE INDEX idx_form_definitions_status ON form_definitions(status);

COMMENT ON COLUMN form_definitions.organization_id IS 'If null => tenant-global. If set => org-scoped.';
COMMENT ON COLUMN form_definitions.schema_json IS 'Form fields + required constraints; compatible with Form Studio output.';

-- =========================================================
-- PIPELINES
-- =========================================================

CREATE TABLE pipelines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    key VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    lifecycle_status pipeline_lifecycle_status NOT NULL DEFAULT 'draft',
    published_version INT,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_pipeline_key_org UNIQUE (organization_id, key)
);

CREATE INDEX idx_pipelines_tenant ON pipelines(tenant_id);
CREATE INDEX idx_pipelines_org ON pipelines(organization_id);
CREATE INDEX idx_pipelines_lifecycle ON pipelines(lifecycle_status);
CREATE INDEX idx_pipelines_key ON pipelines(key);

COMMENT ON COLUMN pipelines.key IS 'Stable identifier for grouping versions (e.g., sales_pipeline).';

-- =========================================================
-- PIPELINE VERSIONS
-- =========================================================

CREATE TABLE pipeline_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    version INT NOT NULL,
    status pipeline_version_status NOT NULL DEFAULT 'draft',
    config_hash VARCHAR(64),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ,

    CONSTRAINT uq_pipeline_version UNIQUE (pipeline_id, version)
);

CREATE INDEX idx_pipeline_versions_pipeline ON pipeline_versions(pipeline_id);
CREATE INDEX idx_pipeline_versions_status ON pipeline_versions(status);

COMMENT ON COLUMN pipeline_versions.config_hash IS 'Optional, to detect drift and support integrity.';

-- =========================================================
-- STAGES
-- =========================================================

CREATE TABLE stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_version_id UUID NOT NULL REFERENCES pipeline_versions(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    stage_order INT NOT NULL,
    classification stage_classification NOT NULL,
    color VARCHAR(7) NOT NULL, -- HEX: #RRGGBB
    is_initial BOOLEAN NOT NULL DEFAULT FALSE,
    is_final BOOLEAN NOT NULL DEFAULT FALSE,
    wip_limit INT,
    sla_hours INT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_stages_pipeline_version ON stages(pipeline_version_id);
CREATE INDEX idx_stages_order ON stages(pipeline_version_id, stage_order);
CREATE INDEX idx_stages_initial ON stages(pipeline_version_id, is_initial) WHERE is_initial = TRUE;
CREATE INDEX idx_stages_final ON stages(pipeline_version_id, is_final) WHERE is_final = TRUE;

COMMENT ON COLUMN stages.color IS 'HEX color code: #RRGGBB';

-- =========================================================
-- STAGE TRANSITIONS
-- =========================================================

CREATE TABLE stage_transitions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pipeline_version_id UUID NOT NULL REFERENCES pipeline_versions(id) ON DELETE CASCADE,
    from_stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    to_stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_stage_transition UNIQUE (from_stage_id, to_stage_id),
    CONSTRAINT chk_no_self_transition CHECK (from_stage_id != to_stage_id)
);

CREATE INDEX idx_stage_transitions_pipeline_version ON stage_transitions(pipeline_version_id);
CREATE INDEX idx_stage_transitions_from ON stage_transitions(from_stage_id);
CREATE INDEX idx_stage_transitions_to ON stage_transitions(to_stage_id);

-- =========================================================
-- STAGE FORM ATTACH RULES
-- =========================================================

CREATE TABLE stage_form_attach_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID NOT NULL REFERENCES stages(id) ON DELETE CASCADE,
    form_definition_id UUID NOT NULL REFERENCES form_definitions(id) ON DELETE CASCADE,
    default_form_status card_form_status NOT NULL DEFAULT 'TO_FILL',
    lock_on_leave_stage BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_stage_form_attach UNIQUE (stage_id, form_definition_id)
);

CREATE INDEX idx_stage_form_attach_stage ON stage_form_attach_rules(stage_id);
CREATE INDEX idx_stage_form_attach_form ON stage_form_attach_rules(form_definition_id);

COMMENT ON COLUMN stage_form_attach_rules.lock_on_leave_stage IS 'Optional: on leaving stage, lock form to prevent edits.';

-- =========================================================
-- AUTOMATION BINDINGS
-- =========================================================

CREATE TABLE automation_bindings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    event_type event_type NOT NULL,
    filter_from_stage_id UUID REFERENCES stages(id) ON DELETE SET NULL,
    filter_to_stage_id UUID REFERENCES stages(id) ON DELETE SET NULL,
    automation_plan_id UUID NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_automation_bindings_pipeline ON automation_bindings(pipeline_id);
CREATE INDEX idx_automation_bindings_event ON automation_bindings(event_type);
CREATE INDEX idx_automation_bindings_enabled ON automation_bindings(enabled) WHERE enabled = TRUE;

COMMENT ON TABLE automation_bindings IS 'Links PLM events to external Orchestrator AI automation plans.';

-- =========================================================
-- CARDS
-- =========================================================

CREATE TABLE cards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    pipeline_id UUID NOT NULL REFERENCES pipelines(id) ON DELETE CASCADE,
    pipeline_version INT NOT NULL,
    current_stage_id UUID NOT NULL REFERENCES stages(id),
    title VARCHAR(500) NOT NULL,
    description TEXT,
    priority card_priority NOT NULL DEFAULT 'medium',
    status card_status NOT NULL DEFAULT 'active',
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);

CREATE INDEX idx_cards_tenant ON cards(tenant_id);
CREATE INDEX idx_cards_org ON cards(organization_id);
CREATE INDEX idx_cards_pipeline ON cards(pipeline_id);
CREATE INDEX idx_cards_stage ON cards(current_stage_id);
CREATE INDEX idx_cards_status ON cards(status);
CREATE INDEX idx_cards_priority ON cards(priority);
CREATE INDEX idx_cards_created ON cards(created_at DESC);

-- Composite index for Kanban board queries
CREATE INDEX idx_cards_kanban ON cards(pipeline_id, status, current_stage_id);

COMMENT ON COLUMN cards.pipeline_version IS 'Version used at card creation (immutably bound).';

-- =========================================================
-- CARD FORMS
-- =========================================================

CREATE TABLE card_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    form_definition_id UUID NOT NULL REFERENCES form_definitions(id),
    form_version INT NOT NULL,
    status card_form_status NOT NULL DEFAULT 'TO_FILL',
    data JSONB NOT NULL DEFAULT '{}',
    attached_at_stage_id UUID NOT NULL REFERENCES stages(id),
    attached_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_card_form UNIQUE (card_id, form_definition_id, form_version)
);

CREATE INDEX idx_card_forms_card ON card_forms(card_id);
CREATE INDEX idx_card_forms_form ON card_forms(form_definition_id);
CREATE INDEX idx_card_forms_status ON card_forms(status);

COMMENT ON COLUMN card_forms.form_version IS 'Snapshot version pinned at attachment time.';

-- =========================================================
-- CARD MOVE HISTORY
-- =========================================================

CREATE TABLE card_move_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    card_id UUID NOT NULL REFERENCES cards(id) ON DELETE CASCADE,
    from_stage_id UUID NOT NULL REFERENCES stages(id),
    to_stage_id UUID NOT NULL REFERENCES stages(id),
    moved_by UUID,
    moved_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reason move_reason NOT NULL DEFAULT 'manual'
);

CREATE INDEX idx_card_move_history_card ON card_move_history(card_id);
CREATE INDEX idx_card_move_history_from ON card_move_history(from_stage_id);
CREATE INDEX idx_card_move_history_to ON card_move_history(to_stage_id);
CREATE INDEX idx_card_move_history_time ON card_move_history(moved_at DESC);

-- =========================================================
-- OUTBOX EVENTS (Transactional Outbox Pattern)
-- =========================================================

CREATE TABLE outbox_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    payload JSONB NOT NULL,
    status outbox_status NOT NULL DEFAULT 'pending',
    attempts INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    last_error TEXT
);

CREATE INDEX idx_outbox_events_status ON outbox_events(status) WHERE status = 'pending';
CREATE INDEX idx_outbox_events_created ON outbox_events(created_at);
CREATE INDEX idx_outbox_events_entity ON outbox_events(entity_type, entity_id);

COMMENT ON TABLE outbox_events IS 'Transactional outbox for guaranteed event delivery to automation engine/webhook.';

-- =========================================================
-- FUNCTIONS & TRIGGERS
-- =========================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updated_at
CREATE TRIGGER update_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_definitions_updated_at
    BEFORE UPDATE ON form_definitions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_pipelines_updated_at
    BEFORE UPDATE ON pipelines
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_stages_updated_at
    BEFORE UPDATE ON stages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_automation_bindings_updated_at
    BEFORE UPDATE ON automation_bindings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_cards_updated_at
    BEFORE UPDATE ON cards
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_card_forms_updated_at
    BEFORE UPDATE ON card_forms
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =========================================================
-- VALIDATION FUNCTIONS
-- =========================================================

-- Validate that a pipeline version has exactly one initial stage
CREATE OR REPLACE FUNCTION validate_single_initial_stage()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.is_initial = TRUE THEN
        IF EXISTS (
            SELECT 1 FROM stages
            WHERE pipeline_version_id = NEW.pipeline_version_id
            AND is_initial = TRUE
            AND id != NEW.id
        ) THEN
            RAISE EXCEPTION 'Pipeline version can only have one initial stage';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER validate_initial_stage
    BEFORE INSERT OR UPDATE ON stages
    FOR EACH ROW EXECUTE FUNCTION validate_single_initial_stage();

-- Validate card move transition is allowed
CREATE OR REPLACE FUNCTION validate_card_transition(
    p_card_id UUID,
    p_to_stage_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
    v_current_stage_id UUID;
    v_pipeline_version_id UUID;
    v_transition_exists BOOLEAN;
BEGIN
    -- Get current stage and pipeline version
    SELECT c.current_stage_id, pv.id
    INTO v_current_stage_id, v_pipeline_version_id
    FROM cards c
    JOIN pipelines p ON p.id = c.pipeline_id
    JOIN pipeline_versions pv ON pv.pipeline_id = p.id AND pv.version = c.pipeline_version
    WHERE c.id = p_card_id;

    -- Check if transition exists
    SELECT EXISTS (
        SELECT 1 FROM stage_transitions
        WHERE pipeline_version_id = v_pipeline_version_id
        AND from_stage_id = v_current_stage_id
        AND to_stage_id = p_to_stage_id
    ) INTO v_transition_exists;

    RETURN v_transition_exists;
END;
$$ LANGUAGE plpgsql;

-- Count active cards in a stage (for WIP limit enforcement)
CREATE OR REPLACE FUNCTION count_active_cards_in_stage(p_stage_id UUID)
RETURNS INT AS $$
BEGIN
    RETURN (
        SELECT COUNT(*) FROM cards
        WHERE current_stage_id = p_stage_id
        AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql;

-- =========================================================
-- VIEWS
-- =========================================================

-- Kanban board view
CREATE OR REPLACE VIEW v_kanban_board AS
SELECT
    c.id AS card_id,
    c.title,
    c.description,
    c.priority,
    c.status AS card_status,
    c.created_at,
    c.pipeline_id,
    c.pipeline_version,
    s.id AS stage_id,
    s.name AS stage_name,
    s.stage_order,
    s.classification,
    s.color,
    s.wip_limit,
    s.sla_hours,
    p.name AS pipeline_name,
    p.key AS pipeline_key,
    o.id AS organization_id,
    o.name AS organization_name,
    t.id AS tenant_id,
    (SELECT COUNT(*) FROM card_forms cf WHERE cf.card_id = c.id AND cf.status = 'TO_FILL') AS pending_forms_count
FROM cards c
JOIN stages s ON s.id = c.current_stage_id
JOIN pipelines p ON p.id = c.pipeline_id
JOIN organizations o ON o.id = c.organization_id
JOIN tenants t ON t.id = c.tenant_id
WHERE c.status = 'active';

-- Pipeline summary view
CREATE OR REPLACE VIEW v_pipeline_summary AS
SELECT
    p.id AS pipeline_id,
    p.key,
    p.name,
    p.lifecycle_status,
    p.published_version,
    p.organization_id,
    p.tenant_id,
    (SELECT COUNT(*) FROM cards c WHERE c.pipeline_id = p.id AND c.status = 'active') AS active_cards,
    (SELECT COUNT(*) FROM cards c WHERE c.pipeline_id = p.id AND c.status = 'closed') AS closed_cards,
    (SELECT COUNT(*) FROM pipeline_versions pv WHERE pv.pipeline_id = p.id) AS version_count
FROM pipelines p;

-- =========================================================
-- ROW LEVEL SECURITY (RLS) - Optional, enable per table
-- =========================================================

-- Example RLS policy for multi-tenant isolation
-- ALTER TABLE cards ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY tenant_isolation_cards ON cards
--     FOR ALL
--     USING (tenant_id = current_setting('app.current_tenant_id')::UUID);
