import axios from 'axios';
import type { AxiosInstance } from 'axios';
import type {
  Tenant,
  Organization,
  Pipeline,
  KanbanBoard,
  CardFull,
  ListResponse,
  FormDefinition,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';

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

  // Organizations
  async getOrganizations(): Promise<ListResponse<Organization>> {
    const { data } = await this.client.get('/organizations');
    return data;
  }

  async createOrganization(name: string): Promise<Organization> {
    const { data } = await this.client.post('/organizations', { name });
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

  async createPipeline(payload: { key: string; name: string; description?: string }): Promise<Pipeline> {
    const { data } = await this.client.post('/pipelines', payload);
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
    title: string;
    description?: string;
    priority?: string;
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

  // Forms
  async getForms(status?: string): Promise<ListResponse<FormDefinition>> {
    const params = status ? { status } : {};
    const { data } = await this.client.get('/forms', { params });
    return data;
  }
}

export const api = new ApiClient();
export default api;
