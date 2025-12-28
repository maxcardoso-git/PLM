-- =========================================================
-- PLM - SEED DATA
-- Exemplo Real: Sales Pipeline
-- =========================================================

-- -------------------------
-- TENANT & ORG
-- -------------------------
INSERT INTO tenants (id, name, status)
VALUES
('11111111-1111-1111-1111-111111111111', 'TR99 Tenant', 'active');

INSERT INTO organizations (id, tenant_id, name, status)
VALUES
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'LeadAID Org', 'active');

-- -------------------------
-- FORM DEFINITIONS (PUBLISHED)
-- -------------------------

-- Form: Lead Base v1
INSERT INTO form_definitions (id, tenant_id, organization_id, name, version, schema_json, status)
VALUES
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Lead Base',
  1,
  '{
    "fields": [
      {"id": "company_name", "type": "text", "label": "Company Name", "required": true},
      {"id": "contact_name", "type": "text", "label": "Contact Name", "required": true},
      {"id": "email", "type": "email", "label": "Email", "required": true},
      {"id": "phone", "type": "tel", "label": "Phone", "required": false}
    ]
  }'::jsonb,
  'published'
);

-- Form: Qualification v1
INSERT INTO form_definitions (id, tenant_id, organization_id, name, version, schema_json, status)
VALUES
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Qualification',
  1,
  '{
    "fields": [
      {"id": "budget_range", "type": "select", "label": "Budget Range", "required": true, "options": ["< $10k", "$10k - $50k", "$50k - $100k", "> $100k"]},
      {"id": "decision_maker", "type": "boolean", "label": "Is Decision Maker?", "required": true},
      {"id": "timeline", "type": "select", "label": "Timeline", "required": true, "options": ["Immediate", "1-3 months", "3-6 months", "6+ months"]},
      {"id": "pain_points", "type": "textarea", "label": "Pain Points", "required": false}
    ]
  }'::jsonb,
  'published'
);

-- Form: Proposal v1
INSERT INTO form_definitions (id, tenant_id, organization_id, name, version, schema_json, status)
VALUES
(
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Proposal',
  1,
  '{
    "fields": [
      {"id": "proposal_value", "type": "number", "label": "Proposal Value ($)", "required": true},
      {"id": "discount_percent", "type": "number", "label": "Discount (%)", "required": false, "min": 0, "max": 100},
      {"id": "valid_until", "type": "date", "label": "Valid Until", "required": true},
      {"id": "terms", "type": "textarea", "label": "Special Terms", "required": false}
    ]
  }'::jsonb,
  'published'
);

-- Form: Contract v1
INSERT INTO form_definitions (id, tenant_id, organization_id, name, version, schema_json, status)
VALUES
(
  'dddddddd-dddd-dddd-dddd-dddddddddddd',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'Contract',
  1,
  '{
    "fields": [
      {"id": "contract_number", "type": "text", "label": "Contract Number", "required": true},
      {"id": "signed_date", "type": "date", "label": "Signed Date", "required": true},
      {"id": "start_date", "type": "date", "label": "Start Date", "required": true},
      {"id": "end_date", "type": "date", "label": "End Date", "required": false},
      {"id": "annual_value", "type": "number", "label": "Annual Contract Value", "required": true}
    ]
  }'::jsonb,
  'published'
);

-- -------------------------
-- PIPELINE: Sales Pipeline
-- -------------------------
INSERT INTO pipelines (id, tenant_id, organization_id, key, name, description, lifecycle_status, published_version, created_at)
VALUES
(
  '33333333-3333-3333-3333-333333333333',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'sales_pipeline',
  'Sales Pipeline',
  'Main sales process from lead to closed deal',
  'published',
  1,
  NOW()
);

-- -------------------------
-- PIPELINE VERSION 1 (PUBLISHED)
-- -------------------------
INSERT INTO pipeline_versions (id, pipeline_id, version, status, created_at, published_at)
VALUES
(
  '44444444-4444-4444-4444-444444444444',
  '33333333-3333-3333-3333-333333333333',
  1,
  'published',
  NOW(),
  NOW()
);

-- -------------------------
-- STAGES
-- -------------------------

-- Stage 1: New Lead (Initial)
INSERT INTO stages (id, pipeline_version_id, name, stage_order, classification, color, is_initial, is_final, wip_limit, sla_hours, active)
VALUES
(
  'eeeeeeee-0001-0001-0001-eeeeeeeeeeee',
  '44444444-4444-4444-4444-444444444444',
  'New Lead',
  1,
  'NOT_STARTED',
  '#6B7280',
  TRUE,
  FALSE,
  NULL,
  24,
  TRUE
);

-- Stage 2: Qualification
INSERT INTO stages (id, pipeline_version_id, name, stage_order, classification, color, is_initial, is_final, wip_limit, sla_hours, active)
VALUES
(
  'eeeeeeee-0002-0002-0002-eeeeeeeeeeee',
  '44444444-4444-4444-4444-444444444444',
  'Qualification',
  2,
  'ON_GOING',
  '#3B82F6',
  FALSE,
  FALSE,
  10,
  48,
  TRUE
);

-- Stage 3: Proposal
INSERT INTO stages (id, pipeline_version_id, name, stage_order, classification, color, is_initial, is_final, wip_limit, sla_hours, active)
VALUES
(
  'eeeeeeee-0003-0003-0003-eeeeeeeeeeee',
  '44444444-4444-4444-4444-444444444444',
  'Proposal',
  3,
  'ON_GOING',
  '#8B5CF6',
  FALSE,
  FALSE,
  5,
  72,
  TRUE
);

-- Stage 4: Negotiation
INSERT INTO stages (id, pipeline_version_id, name, stage_order, classification, color, is_initial, is_final, wip_limit, sla_hours, active)
VALUES
(
  'eeeeeeee-0004-0004-0004-eeeeeeeeeeee',
  '44444444-4444-4444-4444-444444444444',
  'Negotiation',
  4,
  'WAITING',
  '#F59E0B',
  FALSE,
  FALSE,
  NULL,
  NULL,
  TRUE
);

-- Stage 5: Closed Won (Final)
INSERT INTO stages (id, pipeline_version_id, name, stage_order, classification, color, is_initial, is_final, wip_limit, sla_hours, active)
VALUES
(
  'eeeeeeee-0005-0005-0005-eeeeeeeeeeee',
  '44444444-4444-4444-4444-444444444444',
  'Closed Won',
  5,
  'FINISHED',
  '#10B981',
  FALSE,
  TRUE,
  NULL,
  NULL,
  TRUE
);

-- Stage 6: Closed Lost (Final)
INSERT INTO stages (id, pipeline_version_id, name, stage_order, classification, color, is_initial, is_final, wip_limit, sla_hours, active)
VALUES
(
  'eeeeeeee-0006-0006-0006-eeeeeeeeeeee',
  '44444444-4444-4444-4444-444444444444',
  'Closed Lost',
  6,
  'CANCELED',
  '#EF4444',
  FALSE,
  TRUE,
  NULL,
  NULL,
  TRUE
);

-- -------------------------
-- STAGE TRANSITIONS (Grafo de transições permitidas)
-- -------------------------

-- New Lead -> Qualification
INSERT INTO stage_transitions (id, pipeline_version_id, from_stage_id, to_stage_id)
VALUES ('ffffffff-0001-0001-0001-ffffffffffff', '44444444-4444-4444-4444-444444444444', 'eeeeeeee-0001-0001-0001-eeeeeeeeeeee', 'eeeeeeee-0002-0002-0002-eeeeeeeeeeee');

-- New Lead -> Closed Lost
INSERT INTO stage_transitions (id, pipeline_version_id, from_stage_id, to_stage_id)
VALUES ('ffffffff-0002-0002-0002-ffffffffffff', '44444444-4444-4444-4444-444444444444', 'eeeeeeee-0001-0001-0001-eeeeeeeeeeee', 'eeeeeeee-0006-0006-0006-eeeeeeeeeeee');

-- Qualification -> Proposal
INSERT INTO stage_transitions (id, pipeline_version_id, from_stage_id, to_stage_id)
VALUES ('ffffffff-0003-0003-0003-ffffffffffff', '44444444-4444-4444-4444-444444444444', 'eeeeeeee-0002-0002-0002-eeeeeeeeeeee', 'eeeeeeee-0003-0003-0003-eeeeeeeeeeee');

-- Qualification -> Closed Lost
INSERT INTO stage_transitions (id, pipeline_version_id, from_stage_id, to_stage_id)
VALUES ('ffffffff-0004-0004-0004-ffffffffffff', '44444444-4444-4444-4444-444444444444', 'eeeeeeee-0002-0002-0002-eeeeeeeeeeee', 'eeeeeeee-0006-0006-0006-eeeeeeeeeeee');

-- Proposal -> Negotiation
INSERT INTO stage_transitions (id, pipeline_version_id, from_stage_id, to_stage_id)
VALUES ('ffffffff-0005-0005-0005-ffffffffffff', '44444444-4444-4444-4444-444444444444', 'eeeeeeee-0003-0003-0003-eeeeeeeeeeee', 'eeeeeeee-0004-0004-0004-eeeeeeeeeeee');

-- Proposal -> Closed Lost
INSERT INTO stage_transitions (id, pipeline_version_id, from_stage_id, to_stage_id)
VALUES ('ffffffff-0006-0006-0006-ffffffffffff', '44444444-4444-4444-4444-444444444444', 'eeeeeeee-0003-0003-0003-eeeeeeeeeeee', 'eeeeeeee-0006-0006-0006-eeeeeeeeeeee');

-- Negotiation -> Closed Won
INSERT INTO stage_transitions (id, pipeline_version_id, from_stage_id, to_stage_id)
VALUES ('ffffffff-0007-0007-0007-ffffffffffff', '44444444-4444-4444-4444-444444444444', 'eeeeeeee-0004-0004-0004-eeeeeeeeeeee', 'eeeeeeee-0005-0005-0005-eeeeeeeeeeee');

-- Negotiation -> Closed Lost
INSERT INTO stage_transitions (id, pipeline_version_id, from_stage_id, to_stage_id)
VALUES ('ffffffff-0008-0008-0008-ffffffffffff', '44444444-4444-4444-4444-444444444444', 'eeeeeeee-0004-0004-0004-eeeeeeeeeeee', 'eeeeeeee-0006-0006-0006-eeeeeeeeeeee');

-- Negotiation -> Proposal (volta para ajustar proposta)
INSERT INTO stage_transitions (id, pipeline_version_id, from_stage_id, to_stage_id)
VALUES ('ffffffff-0009-0009-0009-ffffffffffff', '44444444-4444-4444-4444-444444444444', 'eeeeeeee-0004-0004-0004-eeeeeeeeeeee', 'eeeeeeee-0003-0003-0003-eeeeeeeeeeee');

-- -------------------------
-- STAGE FORM ATTACH RULES
-- -------------------------

-- New Lead -> Lead Base (TO_FILL)
INSERT INTO stage_form_attach_rules (id, stage_id, form_definition_id, default_form_status, lock_on_leave_stage)
VALUES ('99999999-0001-0001-0001-999999999999', 'eeeeeeee-0001-0001-0001-eeeeeeeeeeee', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'TO_FILL', FALSE);

-- Qualification -> Qualification Form (TO_FILL)
INSERT INTO stage_form_attach_rules (id, stage_id, form_definition_id, default_form_status, lock_on_leave_stage)
VALUES ('99999999-0002-0002-0002-999999999999', 'eeeeeeee-0002-0002-0002-eeeeeeeeeeee', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'TO_FILL', TRUE);

-- Proposal -> Proposal Form (TO_FILL)
INSERT INTO stage_form_attach_rules (id, stage_id, form_definition_id, default_form_status, lock_on_leave_stage)
VALUES ('99999999-0003-0003-0003-999999999999', 'eeeeeeee-0003-0003-0003-eeeeeeeeeeee', 'cccccccc-cccc-cccc-cccc-cccccccccccc', 'TO_FILL', FALSE);

-- Closed Won -> Contract Form (TO_FILL)
INSERT INTO stage_form_attach_rules (id, stage_id, form_definition_id, default_form_status, lock_on_leave_stage)
VALUES ('99999999-0004-0004-0004-999999999999', 'eeeeeeee-0005-0005-0005-eeeeeeeeeeee', 'dddddddd-dddd-dddd-dddd-dddddddddddd', 'TO_FILL', TRUE);

-- -------------------------
-- AUTOMATION BINDINGS
-- -------------------------

-- Trigger automation when card moves to Closed Won
INSERT INTO automation_bindings (id, tenant_id, organization_id, pipeline_id, event_type, filter_from_stage_id, filter_to_stage_id, automation_plan_id, enabled)
VALUES (
  '88888888-0001-0001-0001-888888888888',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  'PLM.CARD.MOVED',
  NULL,
  'eeeeeeee-0005-0005-0005-eeeeeeeeeeee',
  'aaaa0000-0000-0000-0000-000000000001', -- Automation Plan ID from Orchestrator
  TRUE
);

-- Trigger automation when new card is created
INSERT INTO automation_bindings (id, tenant_id, organization_id, pipeline_id, event_type, filter_from_stage_id, filter_to_stage_id, automation_plan_id, enabled)
VALUES (
  '88888888-0002-0002-0002-888888888888',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  'PLM.CARD.CREATED',
  NULL,
  NULL,
  'aaaa0000-0000-0000-0000-000000000002',
  TRUE
);

-- -------------------------
-- SAMPLE CARDS
-- -------------------------

-- Card 1: Acme Corp - In Qualification
INSERT INTO cards (id, tenant_id, organization_id, pipeline_id, pipeline_version, current_stage_id, title, description, priority, status, created_at)
VALUES (
  '77777777-0001-0001-0001-777777777777',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  1,
  'eeeeeeee-0002-0002-0002-eeeeeeeeeeee',
  'Acme Corp - Enterprise Deal',
  'Large enterprise opportunity for CRM implementation',
  'high',
  'active',
  NOW() - INTERVAL '5 days'
);

-- Card 1 Forms
INSERT INTO card_forms (id, card_id, form_definition_id, form_version, status, data, attached_at_stage_id, attached_at)
VALUES (
  '66666666-0001-0001-0001-666666666666',
  '77777777-0001-0001-0001-777777777777',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  1,
  'FILLED',
  '{"company_name": "Acme Corp", "contact_name": "John Smith", "email": "john@acme.com", "phone": "+1-555-0100"}'::jsonb,
  'eeeeeeee-0001-0001-0001-eeeeeeeeeeee',
  NOW() - INTERVAL '5 days'
);

INSERT INTO card_forms (id, card_id, form_definition_id, form_version, status, data, attached_at_stage_id, attached_at)
VALUES (
  '66666666-0002-0002-0002-666666666666',
  '77777777-0001-0001-0001-777777777777',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  1,
  'TO_FILL',
  '{"budget_range": "$50k - $100k", "decision_maker": true}'::jsonb,
  'eeeeeeee-0002-0002-0002-eeeeeeeeeeee',
  NOW() - INTERVAL '3 days'
);

-- Card 1 Move History
INSERT INTO card_move_history (id, card_id, from_stage_id, to_stage_id, moved_at, reason)
VALUES (
  '55555555-0001-0001-0001-555555555555',
  '77777777-0001-0001-0001-777777777777',
  'eeeeeeee-0001-0001-0001-eeeeeeeeeeee',
  'eeeeeeee-0002-0002-0002-eeeeeeeeeeee',
  NOW() - INTERVAL '3 days',
  'manual'
);

-- Card 2: TechStart Inc - In Proposal
INSERT INTO cards (id, tenant_id, organization_id, pipeline_id, pipeline_version, current_stage_id, title, description, priority, status, created_at)
VALUES (
  '77777777-0002-0002-0002-777777777777',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  1,
  'eeeeeeee-0003-0003-0003-eeeeeeeeeeee',
  'TechStart Inc - SaaS License',
  'Mid-market SaaS license opportunity',
  'medium',
  'active',
  NOW() - INTERVAL '10 days'
);

-- Card 2 Forms
INSERT INTO card_forms (id, card_id, form_definition_id, form_version, status, data, attached_at_stage_id, attached_at)
VALUES (
  '66666666-0003-0003-0003-666666666666',
  '77777777-0002-0002-0002-777777777777',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  1,
  'FILLED',
  '{"company_name": "TechStart Inc", "contact_name": "Sarah Johnson", "email": "sarah@techstart.io", "phone": "+1-555-0200"}'::jsonb,
  'eeeeeeee-0001-0001-0001-eeeeeeeeeeee',
  NOW() - INTERVAL '10 days'
);

INSERT INTO card_forms (id, card_id, form_definition_id, form_version, status, data, attached_at_stage_id, attached_at)
VALUES (
  '66666666-0004-0004-0004-666666666666',
  '77777777-0002-0002-0002-777777777777',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  1,
  'LOCKED',
  '{"budget_range": "$10k - $50k", "decision_maker": true, "timeline": "1-3 months", "pain_points": "Manual processes, lack of visibility"}'::jsonb,
  'eeeeeeee-0002-0002-0002-eeeeeeeeeeee',
  NOW() - INTERVAL '7 days'
);

INSERT INTO card_forms (id, card_id, form_definition_id, form_version, status, data, attached_at_stage_id, attached_at)
VALUES (
  '66666666-0005-0005-0005-666666666666',
  '77777777-0002-0002-0002-777777777777',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  1,
  'TO_FILL',
  '{"proposal_value": 35000}'::jsonb,
  'eeeeeeee-0003-0003-0003-eeeeeeeeeeee',
  NOW() - INTERVAL '2 days'
);

-- Card 2 Move History
INSERT INTO card_move_history (id, card_id, from_stage_id, to_stage_id, moved_at, reason)
VALUES
  ('55555555-0002-0002-0002-555555555555', '77777777-0002-0002-0002-777777777777', 'eeeeeeee-0001-0001-0001-eeeeeeeeeeee', 'eeeeeeee-0002-0002-0002-eeeeeeeeeeee', NOW() - INTERVAL '7 days', 'manual'),
  ('55555555-0003-0003-0003-555555555555', '77777777-0002-0002-0002-777777777777', 'eeeeeeee-0002-0002-0002-eeeeeeeeeeee', 'eeeeeeee-0003-0003-0003-eeeeeeeeeeee', NOW() - INTERVAL '2 days', 'manual');

-- Card 3: NewLead Corp - Just Created
INSERT INTO cards (id, tenant_id, organization_id, pipeline_id, pipeline_version, current_stage_id, title, description, priority, status, created_at)
VALUES (
  '77777777-0003-0003-0003-777777777777',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  1,
  'eeeeeeee-0001-0001-0001-eeeeeeeeeeee',
  'NewLead Corp - Initial Contact',
  'Inbound lead from website',
  'low',
  'active',
  NOW()
);

INSERT INTO card_forms (id, card_id, form_definition_id, form_version, status, data, attached_at_stage_id, attached_at)
VALUES (
  '66666666-0006-0006-0006-666666666666',
  '77777777-0003-0003-0003-777777777777',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  1,
  'TO_FILL',
  '{}'::jsonb,
  'eeeeeeee-0001-0001-0001-eeeeeeeeeeee',
  NOW()
);

-- Card 4: Closed Deal - Won
INSERT INTO cards (id, tenant_id, organization_id, pipeline_id, pipeline_version, current_stage_id, title, description, priority, status, created_at, closed_at)
VALUES (
  '77777777-0004-0004-0004-777777777777',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  '33333333-3333-3333-3333-333333333333',
  1,
  'eeeeeeee-0005-0005-0005-eeeeeeeeeeee',
  'BigCorp Ltd - Won Deal',
  'Closed enterprise deal',
  'urgent',
  'closed',
  NOW() - INTERVAL '30 days',
  NOW() - INTERVAL '2 days'
);

-- -------------------------
-- SAMPLE OUTBOX EVENTS
-- -------------------------

INSERT INTO outbox_events (id, tenant_id, organization_id, event_type, entity_type, entity_id, payload, status, attempts, created_at)
VALUES (
  '00000000-0001-0001-0001-000000000000',
  '11111111-1111-1111-1111-111111111111',
  '22222222-2222-2222-2222-222222222222',
  'PLM.CARD.CREATED',
  'Card',
  '77777777-0003-0003-0003-777777777777',
  '{"card_id": "77777777-0003-0003-0003-777777777777", "title": "NewLead Corp - Initial Contact", "pipeline_id": "33333333-3333-3333-3333-333333333333"}'::jsonb,
  'pending',
  0,
  NOW()
);
