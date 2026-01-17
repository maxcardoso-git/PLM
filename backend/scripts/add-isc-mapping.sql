-- =====================================================
-- PLM: Add ISC (Interaction State Controller) Mapping
-- =====================================================
-- This migration adds domain association to pipelines
-- and ISC state mapping to stages for automatic
-- orchestrator integration.
-- =====================================================

-- 1. Add domain field to pipelines table
ALTER TABLE pipelines
ADD COLUMN IF NOT EXISTS domain VARCHAR(100),
ADD COLUMN IF NOT EXISTS domain_description TEXT;

-- 2. Add ISC states mapping to stages table
-- iscStates: Array of ISC states that map to this stage
-- stageStrategy: Description of what the agent should do in this stage
ALTER TABLE stages
ADD COLUMN IF NOT EXISTS isc_states JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS stage_strategy TEXT;

-- 3. Create index for domain lookup
CREATE INDEX IF NOT EXISTS idx_pipelines_domain ON pipelines(domain) WHERE domain IS NOT NULL;

-- 4. Add comment for documentation
COMMENT ON COLUMN pipelines.domain IS 'Orchestrator domain (e.g., credit-recovery, customer-service)';
COMMENT ON COLUMN pipelines.domain_description IS 'Description of the domain context for AI agents';
COMMENT ON COLUMN stages.isc_states IS 'Array of ISC states that map to this stage (e.g., ["VALIDATION", "EVALUATION"])';
COMMENT ON COLUMN stages.stage_strategy IS 'Strategy/instructions for AI agent when card is in this stage';

-- =====================================================
-- ISC States Reference (Orchestrator)
-- =====================================================
-- INIT           - Initial contact, greeting
-- IDENTIFICATION - Customer identification (CPF request)
-- DISCOVERY      - Understanding customer situation
-- CLARIFICATION  - Clarifying unclear information
-- VALIDATION     - Validating customer identity (birth date)
-- EVALUATION     - Evaluating customer situation/eligibility
-- DECISION       - Making decisions on proposals
-- NEGOTIATION    - Negotiating terms
-- COMMITMENT     - Getting customer commitment
-- EXECUTION      - Processing agreed actions
-- CONFIRMATION   - Confirming completion
-- RESOLUTION     - Case resolved
-- FOLLOW_UP      - Post-resolution follow-up
-- STALL          - Customer asked to return later
-- EXIT           - Conversation ended
-- CLOSED         - Case closed
-- =====================================================

-- =====================================================
-- Credit Recovery Pipeline (credito_recupera)
-- =====================================================

-- Step 1: Update pipeline with domain
UPDATE pipelines
SET domain = 'credit-recovery',
    domain_description = 'Recuperação de crédito e negociação de dívidas. O objetivo principal é identificar o cliente, validar sua identidade e negociar um acordo de pagamento.'
WHERE key = 'credito_recupera';

-- Step 2: Update stages with ISC mappings
-- Stage: identificacao (Initial identification)
UPDATE stages s
SET isc_states = '["INIT", "IDENTIFICATION", "DISCOVERY", "CLARIFICATION"]'::jsonb,
    stage_strategy = 'Identificar cliente pelo CPF e validar identidade de forma segura. Solicitar CPF e data de nascimento para confirmação.'
FROM pipeline_versions pv
JOIN pipelines p ON p.id = pv.pipeline_id
WHERE s.pipeline_version_id = pv.id
  AND p.key = 'credito_recupera'
  AND s.key = 'identificacao';

-- Stage: qualificacao (Qualification/Validation)
UPDATE stages s
SET isc_states = '["VALIDATION", "EVALUATION"]'::jsonb,
    stage_strategy = 'Confirmar dados do cliente e verificar elegibilidade para negociação. Apresentar situação atual das dívidas.'
FROM pipeline_versions pv
JOIN pipelines p ON p.id = pv.pipeline_id
WHERE s.pipeline_version_id = pv.id
  AND p.key = 'credito_recupera'
  AND s.key = 'qualificacao';

-- Stage: atendimento (Service/Negotiation)
UPDATE stages s
SET isc_states = '["DECISION", "NEGOTIATION", "COMMITMENT", "EXECUTION", "CONFIRMATION", "RESOLUTION", "EXIT", "CLOSED"]'::jsonb,
    stage_strategy = 'Negociar acordo de pagamento e formalizar condições aceitas. Apresentar opções de parcelamento e descontos disponíveis.'
FROM pipeline_versions pv
JOIN pipelines p ON p.id = pv.pipeline_id
WHERE s.pipeline_version_id = pv.id
  AND p.key = 'credito_recupera'
  AND s.key = 'atendimento';

-- Stage: follow-up (Follow-up)
UPDATE stages s
SET isc_states = '["FOLLOW_UP", "STALL"]'::jsonb,
    stage_strategy = 'Acompanhamento pós-acordo ou aguardando retorno do cliente. Verificar se cliente precisa de mais informações.'
FROM pipeline_versions pv
JOIN pipelines p ON p.id = pv.pipeline_id
WHERE s.pipeline_version_id = pv.id
  AND p.key = 'credito_recupera'
  AND s.key = 'follow-up';

-- =====================================================
-- Verification Query
-- =====================================================
-- Run this to verify the mappings were applied:
--
-- SELECT p.key as pipeline_key, p.domain, s.key as stage_key, s.isc_states, s.stage_strategy
-- FROM pipelines p
-- JOIN pipeline_versions pv ON pv.pipeline_id = p.id
-- JOIN stages s ON s.pipeline_version_id = pv.id
-- WHERE p.key = 'credito_recupera'
-- ORDER BY s.stage_order;
