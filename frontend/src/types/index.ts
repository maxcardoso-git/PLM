// PLM Types

export type TenantStatus = 'active' | 'inactive';
export type FormStatus = 'draft' | 'published' | 'archived';
export type PipelineLifecycleStatus = 'draft' | 'test' | 'published' | 'closed' | 'archived';
export type StageClassification = 'NOT_STARTED' | 'ON_GOING' | 'WAITING' | 'FINISHED' | 'CANCELED';
export type CardFormStatus = 'FILLED' | 'TO_FILL' | 'LOCKED';
export type CardPriority = 'low' | 'medium' | 'high' | 'urgent';
export type CardStatus = 'active' | 'closed' | 'archived';
export type MoveReason = 'manual' | 'api' | 'automation';

export interface Tenant {
  id: string;
  name: string;
  status: TenantStatus;
  createdAt: string;
}

export interface Organization {
  id: string;
  tenantId: string;
  name: string;
  status: 'active' | 'inactive';
  createdAt: string;
}

export interface FormDefinition {
  id: string;
  tenantId: string;
  orgId?: string;
  name: string;
  version: number;
  schemaJson: FormSchema;
  status: FormStatus;
  createdAt: string;
}

export interface FormField {
  id: string;
  type: 'text' | 'email' | 'tel' | 'number' | 'date' | 'select' | 'boolean' | 'textarea';
  label: string;
  required: boolean;
  options?: string[];
  min?: number;
  max?: number;
}

export interface FormSchema {
  fields: FormField[];
}

export interface Pipeline {
  id: string;
  tenantId: string;
  orgId: string;
  projectId?: string;
  projectName?: string;
  key: string;
  name: string;
  description?: string;
  lifecycleStatus: PipelineLifecycleStatus;
  publishedVersion?: number;
  createdAt: string;
}

export interface Stage {
  id: string;
  pipelineVersionId: string;
  name: string;
  stageOrder: number;
  classification: StageClassification;
  color: string;
  isInitial: boolean;
  isFinal: boolean;
  wipLimit?: number;
  slaHours?: number;
  active: boolean;
}

export interface StageTransition {
  id: string;
  fromStageId: string;
  toStageId: string;
}

export interface Card {
  id: string;
  tenantId: string;
  orgId: string;
  pipelineId: string;
  pipelineVersion: number;
  currentStageId: string;
  title: string;
  description?: string;
  priority: CardPriority;
  status: CardStatus;
  uniqueKeyValue?: string;
  createdAt: string;
  updatedAt: string;
  closedAt?: string;
}

export interface CardForm {
  id: string;
  cardId: string;
  formDefinitionId: string;
  formVersion: number;
  status: CardFormStatus;
  data: Record<string, any>;
  attachedAtStageId: string;
  attachedAt: string;
  formDefinition?: FormDefinition;
}

export interface CardMoveHistory {
  id: string;
  cardId: string;
  fromStageId: string;
  toStageId: string;
  movedAt: string;
  reason: MoveReason;
  fromStage?: { id: string; name: string; color: string };
  toStage?: { id: string; name: string; color: string };
}

export interface CardComment {
  id: string;
  cardId: string;
  userId?: string;
  userName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

// Form Attach Rule for Kanban
export interface KanbanFormAttachRule {
  id: string;
  formDefinitionId?: string;
  externalFormId?: string;
  externalFormName?: string;
  defaultFormStatus: CardFormStatus;
  uniqueKeyFieldId?: string;
  formDefinition?: {
    id: string;
    name: string;
    version: number;
    schemaJson?: { fields?: any[] };
  };
}

// Stage Trigger for Kanban
export interface KanbanStageTrigger {
  id: string;
  integrationName: string;
}

// Kanban Board Types
export interface KanbanStage extends Stage {
  allowedTransitions: { toStageId: string; toStageName: string }[];
  formAttachRules: KanbanFormAttachRule[];
  triggers: KanbanStageTrigger[];
  hasTriggers: boolean;
  cards: KanbanCard[];
  cardCount: number;
}

export interface KanbanCard extends Card {
  pendingFormsCount: number;
  filledFormsCount: number;
  totalFormsCount: number;
  forms?: { id: string; status: CardFormStatus; formDefinitionId: string; formDefinition: { id: string; name: string } }[];
  triggerExecutionSummary?: TriggerExecutionSummary;
}

export interface KanbanBoard {
  pipeline: {
    id: string;
    key: string;
    name: string;
    publishedVersion: number;
    lifecycleStatus: string;
    versionStatus: string;
  };
  stages: KanbanStage[];
}

export interface CardFull {
  card: Card & {
    currentStage: Stage;
    pipeline: { id: string; key: string; name: string };
  };
  forms: CardForm[];
  history: CardMoveHistory[];
  triggerExecutions?: TriggerExecution[];
  comments?: CardComment[];
  allowedTransitions: { id: string; name: string; color: string; wipLimit?: number }[];
}

// API Response Types
export interface ListResponse<T> {
  items: T[];
}

export interface MoveBlockedError {
  code:
    | 'TRANSITION_NOT_ALLOWED'
    | 'WIP_LIMIT_REACHED'
    | 'FORMS_INCOMPLETE'
    | 'PERMISSION_DENIED'
    | 'FORMS_NOT_FILLED'
    | 'COMMENT_REQUIRED'
    | 'OWNER_ONLY';
  message: string;
  details?: any;
}

// Integration Types
export interface Integration {
  id: string;
  tenantId: string;
  orgId: string;
  key: string;
  name: string;
  description?: string;
  externalApiKeyId: string;
  externalApiKeyName?: string;
  httpMethod: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  endpoint?: string;
  defaultPayload?: Record<string, any>;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExternalApiKey {
  id: string;
  name: string;
  key?: string;
  status?: string;
}

// Stage Trigger Types
export type TriggerEventType = 'CARD_MOVEMENT' | 'FORM_FIELD_CHANGE';
export type TriggerExecutionStatus = 'PENDING' | 'SUCCESS' | 'FAILURE';

// Trigger Execution Types
export interface TriggerExecutionSummary {
  total: number;
  success: number;
  failure: number;
  pending: number;
  lastStatus: TriggerExecutionStatus | null;
  lastExecutedAt: string | null;
  lastIntegrationName: string | null;
}

export interface TriggerExecution {
  id: string;
  status: TriggerExecutionStatus;
  eventType: TriggerEventType;
  integrationName: string;
  integrationKey: string;
  stageName?: string;
  executedAt: string;
  completedAt?: string;
  errorMessage?: string;
  responsePayload?: any;
}
export type TriggerOperator =
  | 'EQUALS'
  | 'NOT_EQUALS'
  | 'GREATER_THAN'
  | 'LESS_THAN'
  | 'GREATER_OR_EQUAL'
  | 'LESS_OR_EQUAL'
  | 'CONTAINS'
  | 'NOT_CONTAINS'
  | 'IS_EMPTY'
  | 'IS_NOT_EMPTY';

export interface StageTriggerCondition {
  id: string;
  triggerId: string;
  fieldPath: string;
  operator: TriggerOperator;
  value: string;
  createdAt: string;
}

export interface StageTrigger {
  id: string;
  stageId: string;
  integrationId: string;
  eventType: TriggerEventType;
  fromStageId?: string;
  formDefinitionId?: string;
  externalFormId?: string;
  externalFormName?: string;
  fieldId?: string;
  executionOrder: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  integration: {
    id: string;
    name: string;
    key: string;
  };
  fromStage?: {
    id: string;
    name: string;
  };
  formDefinition?: {
    id: string;
    name: string;
  };
  conditions: StageTriggerCondition[];
}

export interface CreateStageTriggerPayload {
  integrationId: string;
  eventType: TriggerEventType;
  fromStageId?: string;
  formDefinitionId?: string;
  externalFormId?: string;
  externalFormName?: string;
  fieldId?: string;
  executionOrder?: number;
  enabled?: boolean;
  conditions?: {
    fieldPath: string;
    operator: TriggerOperator;
    value: string;
  }[];
}

export interface UpdateStageTriggerPayload {
  integrationId?: string;
  eventType?: TriggerEventType;
  fromStageId?: string;
  formDefinitionId?: string;
  externalFormId?: string;
  externalFormName?: string;
  fieldId?: string;
  executionOrder?: number;
  enabled?: boolean;
}

// Transition Rule Types
export type TransitionRuleType = 'FORM_REQUIRED' | 'COMMENT_REQUIRED' | 'OWNER_ONLY';

export interface TransitionRule {
  id: string;
  transitionId: string;
  ruleType: TransitionRuleType;
  formDefinitionId?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransitionRulePayload {
  ruleType: TransitionRuleType;
  formDefinitionId?: string;
  enabled?: boolean;
}

export interface UpdateTransitionRulePayload {
  enabled?: boolean;
}

// PLM API Key Types
export type PlmApiKeyPermission =
  | 'cards:create'
  | 'cards:read'
  | 'cards:update'
  | 'cards:move'
  | 'forms:update';

export interface PlmApiKey {
  id: string;
  name: string;
  key?: string;
  description?: string;
  permissions: PlmApiKeyPermission[];
  enabled: boolean;
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlmApiKeyPayload {
  name: string;
  description?: string;
  permissions: PlmApiKeyPermission[];
  expiresAt?: string;
}

export interface UpdatePlmApiKeyPayload {
  name?: string;
  description?: string;
  permissions?: PlmApiKeyPermission[];
  enabled?: boolean;
  expiresAt?: string;
}

// User Groups and Permissions
export type PipelineRole = 'VIEWER' | 'OPERATOR' | 'SUPERVISOR' | 'ADMIN';

export interface UserGroup {
  id: string;
  tenantId: string;
  orgId: string;
  name: string;
  description?: string;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  _count?: { members: number; permissions: number };
}

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  addedBy?: string;
  addedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
  };
}

export interface PipelinePermission {
  id: string;
  pipelineId: string;
  groupId: string;
  role: PipelineRole;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
  group?: {
    id: string;
    name: string;
    description: string | null;
  };
}

export interface PublishedPipeline {
  id: string;
  name: string;
  projectName?: string;
  description?: string;
  createdAt: string;
  role: PipelineRole;
  groupName: string;
  publishedVersion?: {
    id: string;
    versionNumber: number;
    publishedAt: string;
  };
}
