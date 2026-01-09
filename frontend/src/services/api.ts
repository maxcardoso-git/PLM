import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type {
  Tenant,
  Pipeline,
  KanbanBoard,
  CardFull,
  CardComment,
  ListResponse,
  FormDefinition,
  Integration,
  StageTrigger,
  CreateStageTriggerPayload,
  UpdateStageTriggerPayload,
  TransitionRule,
  CreateTransitionRulePayload,
  UpdateTransitionRulePayload,
  PlmApiKey,
  CreatePlmApiKeyPayload,
  UpdatePlmApiKeyPayload,
  UserGroup,
  GroupMember,
  PipelinePermission,
  PipelineRole,
  PublishedPipeline,
  CardConversation,
  ConversationMessage,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

class ApiClient {
  private client: AxiosInstance;
  private tenantId: string = '';
  private organizationId: string = '';

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
      withCredentials: true,
    });

    this.client.interceptors.request.use((config) => {
      if (this.tenantId) {
        config.headers['X-Tenant-Id'] = this.tenantId;
      }
      if (this.organizationId) {
        config.headers['X-Organization-Id'] = this.organizationId;
      }
      return config;
    });
  }

  setTenant(tenantId: string) {
    this.tenantId = tenantId;
  }

  setOrganization(organizationId: string) {
    this.organizationId = organizationId;
  }

  // Tenants
  async getTenants(): Promise<ListResponse<Tenant>> {
    const { data } = await this.client.get('/tenants');
    return data;
  }

  async createTenant(name: string): Promise<Tenant> {
    const { data } = await this.client.post('/tenants', { name });
    return data;
  }

  // Pipelines
  async getPipelines(lifecycleStatus?: string): Promise<ListResponse<Pipeline>> {
    const params = lifecycleStatus ? { lifecycle_status: lifecycleStatus } : {};
    const { data } = await this.client.get('/pipelines', { params });
    return data;
  }

  async getPipeline(id: string): Promise<Pipeline> {
    const { data } = await this.client.get(`/pipelines/${id}`);
    return data;
  }

  async createPipeline(payload: {
    key: string;
    name: string;
    description?: string;
    projectId?: string;
    projectName?: string;
  }): Promise<Pipeline> {
    const { data } = await this.client.post('/pipelines', payload);
    return data;
  }

  async deletePipeline(id: string): Promise<{ deleted: boolean; id: string }> {
    const { data } = await this.client.delete(`/pipelines/${id}`);
    return data;
  }

  // Kanban Board
  async getKanbanBoard(pipelineId: string): Promise<KanbanBoard> {
    const { data } = await this.client.get(`/cards/kanban/${pipelineId}`);
    return data;
  }

  // Cards
  async getCard(cardId: string): Promise<CardFull> {
    const { data } = await this.client.get(`/cards/${cardId}`);
    return data;
  }

  async createCard(payload: {
    pipelineId: string;
    initialStageId?: string;
    title: string;
    description?: string;
    priority?: string;
    uniqueKeyValue?: string;
    forms?: { formDefinitionId: string; status: 'FILLED' | 'TO_FILL'; data: Record<string, any> }[];
  }): Promise<CardFull> {
    const { data } = await this.client.post('/cards', payload);
    return data;
  }

  async moveCard(cardId: string, toStageId: string, reason: string = 'manual'): Promise<CardFull> {
    const { data } = await this.client.post(`/cards/${cardId}/move`, {
      toStageId,
      reason,
    });
    return data;
  }

  async updateCardForm(
    cardId: string,
    formDefinitionId: string,
    payload: { status?: string; data?: Record<string, any> }
  ): Promise<any> {
    const { data } = await this.client.patch(`/cards/${cardId}/forms/${formDefinitionId}`, payload);
    return data;
  }

  async updateExternalForm(
    cardId: string,
    externalFormId: string,
    payload: { stageId: string; externalRowId?: string; status?: string }
  ): Promise<any> {
    const { data } = await this.client.patch(`/cards/${cardId}/external-forms/${externalFormId}`, payload);
    return data;
  }

  async getExternalForm(
    cardId: string,
    externalFormId: string
  ): Promise<{ id: string; cardId: string; externalFormId: string; externalRowId: string | null; stageId: string; status: string } | null> {
    const { data } = await this.client.get(`/cards/${cardId}/external-forms/${externalFormId}`);
    return data;
  }

  async updateCard(cardId: string, payload: {
    title?: string;
    description?: string;
    priority?: string;
    uniqueKeyValue?: string;
  }): Promise<CardFull> {
    const { data } = await this.client.patch(`/cards/${cardId}`, payload);
    return data;
  }

  async deleteCard(cardId: string): Promise<{ deleted: boolean; id: string }> {
    const { data } = await this.client.delete(`/cards/${cardId}`);
    return data;
  }

  // Forms
  async getForms(status?: string): Promise<ListResponse<FormDefinition>> {
    const params = status ? { status } : {};
    const { data } = await this.client.get('/forms', { params });
    return data;
  }

  // Stages
  async createStage(pipelineId: string, version: number, payload: {
    name: string;
    color: string;
    classification: 'NOT_STARTED' | 'ON_GOING' | 'WAITING' | 'FINISHED' | 'CANCELED';
    stageOrder: number;
    isInitial: boolean;
    isFinal: boolean;
  }): Promise<{ id: string; name: string; color: string }> {
    const { data } = await this.client.post(
      `/pipelines/${pipelineId}/versions/${version}/stages`,
      payload
    );
    return data;
  }

  async reorderStages(versionId: string, stageOrders: { id: string; stageOrder: number }[]): Promise<void> {
    await this.client.put(`/pipeline-versions/${versionId}/stages/reorder`, { stageOrders });
  }

  // Transitions
  async createTransition(pipelineId: string, version: number, payload: {
    fromStageId: string;
    toStageId: string;
  }): Promise<{ id: string }> {
    const { data } = await this.client.post(
      `/pipelines/${pipelineId}/versions/${version}/transitions`,
      payload
    );
    return data;
  }

  // Integrations
  async getIntegrations(): Promise<ListResponse<Integration>> {
    const { data } = await this.client.get('/integrations');
    return data;
  }

  async getIntegration(id: string): Promise<Integration> {
    const { data } = await this.client.get(`/integrations/${id}`);
    return data;
  }

  async createIntegration(payload: {
    key: string;
    name: string;
    description?: string;
    externalApiKeyId: string;
    externalApiKeyName?: string;
    httpMethod?: string;
    endpoint?: string;
    defaultPayload?: Record<string, any>;
  }): Promise<Integration> {
    const { data } = await this.client.post('/integrations', payload);
    return data;
  }

  async updateIntegration(id: string, payload: {
    name?: string;
    description?: string;
    httpMethod?: string;
    endpoint?: string;
    defaultPayload?: Record<string, any>;
    enabled?: boolean;
  }): Promise<Integration> {
    const { data } = await this.client.patch(`/integrations/${id}`, payload);
    return data;
  }

  async deleteIntegration(id: string): Promise<{ deleted: boolean; id: string }> {
    const { data } = await this.client.delete(`/integrations/${id}`);
    return data;
  }

  async testIntegration(id: string, payload?: Record<string, any>): Promise<{
    integration: { id: string; name: string; httpMethod: string; endpoint?: string; externalApiKeyId: string };
    testPayload: Record<string, any>;
  }> {
    const { data } = await this.client.post(`/integrations/${id}/test`, { payload });
    return data;
  }

  async getIntegrationUsage(id: string): Promise<{
    integration: { id: string; key: string; name: string };
    usages: {
      triggerId: string;
      eventType: string;
      enabled: boolean;
      pipeline: { id: string; key: string; name: string };
      version: number;
      versionStatus: string;
      stage: { id: string; name: string };
    }[];
    totalCount: number;
  }> {
    const { data } = await this.client.get(`/integrations/${id}/usage`);
    return data;
  }

  // Stage Triggers
  async getStageTriggers(stageId: string): Promise<ListResponse<StageTrigger>> {
    const { data } = await this.client.get(`/stages/${stageId}/triggers`);
    return data;
  }

  async createStageTrigger(stageId: string, payload: CreateStageTriggerPayload): Promise<StageTrigger> {
    const { data } = await this.client.post(`/stages/${stageId}/triggers`, payload);
    return data;
  }

  async updateStageTrigger(triggerId: string, payload: UpdateStageTriggerPayload): Promise<StageTrigger> {
    const { data } = await this.client.patch(`/stage-triggers/${triggerId}`, payload);
    return data;
  }

  async deleteStageTrigger(triggerId: string): Promise<{ deleted: boolean; id: string }> {
    const { data } = await this.client.delete(`/stage-triggers/${triggerId}`);
    return data;
  }

  // Card Comments
  async getCardComments(cardId: string): Promise<ListResponse<CardComment>> {
    const { data } = await this.client.get(`/cards/${cardId}/comments`);
    return data;
  }

  async createCardComment(cardId: string, payload: {
    content: string;
    userName: string;
    userId?: string;
  }): Promise<CardComment> {
    const { data } = await this.client.post(`/cards/${cardId}/comments`, payload);
    return data;
  }

  async deleteCardComment(cardId: string, commentId: string): Promise<{ deleted: boolean; id: string }> {
    const { data } = await this.client.delete(`/cards/${cardId}/comments/${commentId}`);
    return data;
  }

  // Transition Rules
  async getTransitionRules(transitionId: string): Promise<ListResponse<TransitionRule>> {
    const { data } = await this.client.get(`/transitions/${transitionId}/rules`);
    return data;
  }

  async createTransitionRule(transitionId: string, payload: CreateTransitionRulePayload): Promise<TransitionRule> {
    const { data } = await this.client.post(`/transitions/${transitionId}/rules`, payload);
    return data;
  }

  async updateTransitionRule(ruleId: string, payload: UpdateTransitionRulePayload): Promise<TransitionRule> {
    const { data } = await this.client.patch(`/transition-rules/${ruleId}`, payload);
    return data;
  }

  async deleteTransitionRule(ruleId: string): Promise<{ deleted: boolean; id: string }> {
    const { data } = await this.client.delete(`/transition-rules/${ruleId}`);
    return data;
  }

  // PLM API Keys
  async getPlmApiKeys(): Promise<ListResponse<PlmApiKey>> {
    const { data } = await this.client.get('/plm-api-keys');
    return data;
  }

  async getPlmApiKey(id: string): Promise<PlmApiKey> {
    const { data } = await this.client.get(`/plm-api-keys/${id}`);
    return data;
  }

  async createPlmApiKey(payload: CreatePlmApiKeyPayload): Promise<PlmApiKey> {
    const { data } = await this.client.post('/plm-api-keys', payload);
    return data;
  }

  async updatePlmApiKey(id: string, payload: UpdatePlmApiKeyPayload): Promise<PlmApiKey> {
    const { data } = await this.client.patch(`/plm-api-keys/${id}`, payload);
    return data;
  }

  async deletePlmApiKey(id: string): Promise<{ deleted: boolean; id: string }> {
    const { data } = await this.client.delete(`/plm-api-keys/${id}`);
    return data;
  }

  async regeneratePlmApiKey(id: string): Promise<PlmApiKey> {
    const { data } = await this.client.post(`/plm-api-keys/${id}/regenerate`);
    return data;
  }

  async getPlmApiKeyPermissions(): Promise<{ permissions: { value: string; label: string }[] }> {
    const { data } = await this.client.get('/plm-api-keys/permissions');
    return data;
  }

  // User Groups
  async getUserGroups(): Promise<ListResponse<UserGroup>> {
    const { data } = await this.client.get('/user-groups');
    return data;
  }

  async getUserGroup(id: string): Promise<UserGroup & { members: GroupMember[] }> {
    const { data } = await this.client.get(`/user-groups/${id}`);
    return data;
  }

  async createUserGroup(payload: { name: string; description?: string }): Promise<UserGroup> {
    const { data } = await this.client.post('/user-groups', payload);
    return data;
  }

  async updateUserGroup(id: string, payload: { name?: string; description?: string }): Promise<UserGroup> {
    const { data } = await this.client.patch(`/user-groups/${id}`, payload);
    return data;
  }

  async deleteUserGroup(id: string): Promise<{ deleted: boolean; id: string }> {
    const { data } = await this.client.delete(`/user-groups/${id}`);
    return data;
  }

  async getGroupMembers(groupId: string): Promise<ListResponse<GroupMember>> {
    const { data } = await this.client.get(`/user-groups/${groupId}/members`);
    return data;
  }

  async addGroupMembers(groupId: string, userIds: string[]): Promise<{ added: number }> {
    const { data } = await this.client.post(`/user-groups/${groupId}/members`, { userIds });
    return data;
  }

  async removeGroupMember(groupId: string, userId: string): Promise<{ removed: boolean }> {
    const { data } = await this.client.delete(`/user-groups/${groupId}/members/${userId}`);
    return data;
  }

  async getAvailableUsersForGroup(groupId: string): Promise<{ items: { id: string; name: string; email: string }[] }> {
    const { data } = await this.client.get(`/user-groups/${groupId}/available-users`);
    return data;
  }

  // Pipeline Permissions
  async getPipelinePermissions(pipelineId: string): Promise<PipelinePermission[]> {
    const { data } = await this.client.get(`/pipelines/${pipelineId}/permissions`);
    return data;
  }

  async assignPipelinePermission(pipelineId: string, payload: { groupId: string; role: PipelineRole }): Promise<PipelinePermission> {
    const { data } = await this.client.post(`/pipelines/${pipelineId}/permissions`, payload);
    return data;
  }

  async updatePipelinePermission(pipelineId: string, permissionId: string, payload: { role: PipelineRole }): Promise<PipelinePermission> {
    const { data } = await this.client.patch(`/pipelines/${pipelineId}/permissions/${permissionId}`, payload);
    return data;
  }

  async removePipelinePermission(pipelineId: string, permissionId: string): Promise<void> {
    await this.client.delete(`/pipelines/${pipelineId}/permissions/${permissionId}`);
  }

  async getMyPipelinePermission(pipelineId: string): Promise<{ hasAccess: boolean; permission: { role: PipelineRole; groupId: string; groupName: string } | null }> {
    const { data } = await this.client.get(`/pipelines/${pipelineId}/my-permission`);
    return data;
  }

  async getAvailableGroupsForPipeline(pipelineId: string): Promise<{ id: string; name: string; description: string | null; _count: { members: number } }[]> {
    const { data } = await this.client.get(`/pipelines/${pipelineId}/available-groups`);
    return data;
  }

  // Published Pipelines (for operators)
  async getPublishedPipelines(): Promise<PublishedPipeline[]> {
    const { data } = await this.client.get('/published-pipelines');
    return data;
  }

  async getPublishedPipelinesByProject(): Promise<Record<string, PublishedPipeline[]>> {
    const { data } = await this.client.get('/published-pipelines/by-project');
    return data;
  }

  // Card Conversations
  async getCardConversations(cardId: string): Promise<CardConversation[]> {
    const { data } = await this.client.get(`/cards/${cardId}/conversations`);
    return data;
  }

  async getConversation(
    conversationId: string,
    limit?: number,
    offset?: number
  ): Promise<CardConversation & { messages: ConversationMessage[] }> {
    const params: Record<string, number> = {};
    if (limit) params.limit = limit;
    if (offset) params.offset = offset;
    const { data } = await this.client.get(`/conversations/${conversationId}`, { params });
    return data;
  }

  async getConversationMessages(
    conversationId: string,
    limit?: number,
    offset?: number
  ): Promise<{ messages: ConversationMessage[]; total: number }> {
    const params: Record<string, number> = {};
    if (limit) params.limit = limit;
    if (offset) params.offset = offset;
    const { data } = await this.client.get(`/conversations/${conversationId}/messages`, { params });
    return data;
  }
}

export const api = new ApiClient();
export default api;
