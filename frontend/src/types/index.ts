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
  createdAt: string;
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

// Kanban Board Types
export interface KanbanStage extends Stage {
  allowedTransitions: { toStageId: string; toStageName: string }[];
  cards: KanbanCard[];
  cardCount: number;
}

export interface KanbanCard extends Card {
  pendingFormsCount: number;
  forms?: { id: string; status: CardFormStatus; formDefinition: { name: string } }[];
}

export interface KanbanBoard {
  pipeline: {
    id: string;
    key: string;
    name: string;
    publishedVersion: number;
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
  allowedTransitions: { id: string; name: string; color: string; wipLimit?: number }[];
}

// API Response Types
export interface ListResponse<T> {
  items: T[];
}

export interface MoveBlockedError {
  code: 'TRANSITION_NOT_ALLOWED' | 'WIP_LIMIT_REACHED' | 'FORMS_INCOMPLETE' | 'PERMISSION_DENIED';
  message: string;
  details?: any;
}
