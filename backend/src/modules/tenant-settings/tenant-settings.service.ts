import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateTenantSettingsDto, TenantSettingsResponseDto } from './dto/tenant-settings.dto';

@Injectable()
export class TenantSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(tenantId: string): Promise<TenantSettingsResponseDto> {
    let settings = await this.prisma.tenantSettings.findUnique({
      where: { tenantId },
    });

    // If no settings exist, create default settings
    if (!settings) {
      settings = await this.prisma.tenantSettings.create({
        data: {
          tenantId,
          externalFormsListEndpoint: '/forms',
          externalFormsSchemaEndpoint: '/forms/{formId}',
          externalFormsDataEndpoint: '/submissions?formId={formId}',
          externalFormsEnabled: false,
          externalProjectsListEndpoint: '/projects',
          externalProjectsEnabled: false,
          apiKeysServiceListEndpoint: '/api-keys',
          apiKeysServiceEnabled: false,
        },
      });
    }

    return this.mapToResponse(settings);
  }

  async updateSettings(
    tenantId: string,
    dto: UpdateTenantSettingsDto,
  ): Promise<TenantSettingsResponseDto> {
    const updateData: any = {};

    if (dto.externalForms) {
      if (dto.externalForms.baseUrl !== undefined) {
        updateData.externalFormsBaseUrl = dto.externalForms.baseUrl;
      }
      if (dto.externalForms.listEndpoint !== undefined) {
        updateData.externalFormsListEndpoint = dto.externalForms.listEndpoint;
      }
      if (dto.externalForms.schemaEndpoint !== undefined) {
        updateData.externalFormsSchemaEndpoint = dto.externalForms.schemaEndpoint;
      }
      if (dto.externalForms.dataEndpoint !== undefined) {
        updateData.externalFormsDataEndpoint = dto.externalForms.dataEndpoint;
      }
      if (dto.externalForms.apiKey !== undefined) {
        updateData.externalFormsApiKey = dto.externalForms.apiKey;
      }
      if (dto.externalForms.enabled !== undefined) {
        updateData.externalFormsEnabled = dto.externalForms.enabled;
      }
    }

    if (dto.externalProjects) {
      if (dto.externalProjects.baseUrl !== undefined) {
        updateData.externalProjectsBaseUrl = dto.externalProjects.baseUrl;
      }
      if (dto.externalProjects.listEndpoint !== undefined) {
        updateData.externalProjectsListEndpoint = dto.externalProjects.listEndpoint;
      }
      if (dto.externalProjects.apiKey !== undefined) {
        updateData.externalProjectsApiKey = dto.externalProjects.apiKey;
      }
      if (dto.externalProjects.enabled !== undefined) {
        updateData.externalProjectsEnabled = dto.externalProjects.enabled;
      }
    }

    if (dto.apiKeysService) {
      if (dto.apiKeysService.baseUrl !== undefined) {
        updateData.apiKeysServiceBaseUrl = dto.apiKeysService.baseUrl;
      }
      if (dto.apiKeysService.listEndpoint !== undefined) {
        updateData.apiKeysServiceListEndpoint = dto.apiKeysService.listEndpoint;
      }
      if (dto.apiKeysService.apiKey !== undefined) {
        updateData.apiKeysServiceApiKey = dto.apiKeysService.apiKey;
      }
      if (dto.apiKeysService.enabled !== undefined) {
        updateData.apiKeysServiceEnabled = dto.apiKeysService.enabled;
      }
    }

    const settings = await this.prisma.tenantSettings.upsert({
      where: { tenantId },
      update: updateData,
      create: {
        tenantId,
        ...updateData,
        externalFormsListEndpoint: updateData.externalFormsListEndpoint || '/forms',
        externalFormsSchemaEndpoint: updateData.externalFormsSchemaEndpoint || '/forms/{formId}',
        externalFormsDataEndpoint: updateData.externalFormsDataEndpoint || '/submissions?formId={formId}',
        externalFormsEnabled: updateData.externalFormsEnabled ?? false,
        externalProjectsListEndpoint: updateData.externalProjectsListEndpoint || '/projects',
        externalProjectsEnabled: updateData.externalProjectsEnabled ?? false,
        apiKeysServiceListEndpoint: updateData.apiKeysServiceListEndpoint || '/api-keys',
        apiKeysServiceEnabled: updateData.apiKeysServiceEnabled ?? false,
      },
    });

    return this.mapToResponse(settings);
  }

  private mapToResponse(settings: any): TenantSettingsResponseDto {
    return {
      externalForms: {
        baseUrl: settings.externalFormsBaseUrl || '',
        listEndpoint: settings.externalFormsListEndpoint || '/forms',
        schemaEndpoint: settings.externalFormsSchemaEndpoint || '/forms/{formId}',
        dataEndpoint: settings.externalFormsDataEndpoint || '/submissions?formId={formId}',
        apiKey: settings.externalFormsApiKey || '',
        enabled: settings.externalFormsEnabled || false,
      },
      externalProjects: {
        baseUrl: settings.externalProjectsBaseUrl || '',
        listEndpoint: settings.externalProjectsListEndpoint || '/projects',
        apiKey: settings.externalProjectsApiKey || '',
        enabled: settings.externalProjectsEnabled || false,
      },
      apiKeysService: {
        baseUrl: settings.apiKeysServiceBaseUrl || '',
        listEndpoint: settings.apiKeysServiceListEndpoint || '/api-keys',
        apiKey: settings.apiKeysServiceApiKey || '',
        enabled: settings.apiKeysServiceEnabled || false,
      },
    };
  }
}
