import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateIntegrationDto, UpdateIntegrationDto } from './dto';
import { TenantContext } from '../../common/decorators';

@Injectable()
export class IntegrationsService {
  constructor(private prisma: PrismaService) {}

  async create(ctx: TenantContext, dto: CreateIntegrationDto) {
    const existing = await this.prisma.integration.findFirst({
      where: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId!,
        key: dto.key,
      },
    });

    if (existing) {
      throw new ConflictException(`Integration with key "${dto.key}" already exists in this organization`);
    }

    return this.prisma.integration.create({
      data: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId!,
        key: dto.key,
        name: dto.name,
        description: dto.description,
        externalApiKeyId: dto.externalApiKeyId,
        externalApiKeyName: dto.externalApiKeyName,
        httpMethod: dto.httpMethod || 'POST',
        endpoint: dto.endpoint,
        defaultPayload: dto.defaultPayload || {},
        enabled: true,
      },
    });
  }

  async findAll(ctx: TenantContext) {
    return this.prisma.integration.findMany({
      where: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId!,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(ctx: TenantContext, id: string) {
    const integration = await this.prisma.integration.findFirst({
      where: {
        id,
        tenantId: ctx.tenantId,
        orgId: ctx.orgId!,
      },
    });

    if (!integration) {
      throw new NotFoundException(`Integration ${id} not found`);
    }

    return integration;
  }

  async update(ctx: TenantContext, id: string, dto: UpdateIntegrationDto) {
    await this.findOne(ctx, id);

    return this.prisma.integration.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        httpMethod: dto.httpMethod,
        endpoint: dto.endpoint,
        defaultPayload: dto.defaultPayload,
        enabled: dto.enabled,
      },
    });
  }

  async delete(ctx: TenantContext, id: string) {
    const integration = await this.findOne(ctx, id);

    // Check if integration is being used by any stage triggers
    const triggersUsingIntegration = await this.prisma.stageTrigger.findMany({
      where: { integrationId: id },
      include: {
        stage: {
          select: {
            name: true,
            pipelineVersion: {
              select: {
                version: true,
                pipeline: {
                  select: { name: true },
                },
              },
            },
          },
        },
      },
    });

    if (triggersUsingIntegration.length > 0) {
      // Build a user-friendly message listing where the integration is used
      const usages = triggersUsingIntegration.map((trigger) => ({
        pipeline: trigger.stage.pipelineVersion.pipeline.name,
        version: trigger.stage.pipelineVersion.version,
        stage: trigger.stage.name,
      }));

      // Get unique pipeline/stage combinations
      const uniqueUsages = usages.reduce((acc, usage) => {
        const key = `${usage.pipeline}-v${usage.version}-${usage.stage}`;
        if (!acc.some((u) => `${u.pipeline}-v${u.version}-${u.stage}` === key)) {
          acc.push(usage);
        }
        return acc;
      }, [] as typeof usages);

      throw new ConflictException({
        code: 'INTEGRATION_IN_USE',
        message: `Não é possível excluir a integração "${integration.name}" pois ela está sendo utilizada em gatilhos de stage.`,
        details: {
          usages: uniqueUsages,
          count: triggersUsingIntegration.length,
        },
      });
    }

    await this.prisma.integration.delete({
      where: { id },
    });

    return { deleted: true, id };
  }

  async test(ctx: TenantContext, id: string, payload: Record<string, any>) {
    const integration = await this.findOne(ctx, id);

    // Return integration details for frontend to make the actual test call
    // The frontend will use the proxy endpoint with the API key
    return {
      integration: {
        id: integration.id,
        name: integration.name,
        httpMethod: integration.httpMethod,
        endpoint: integration.endpoint,
        externalApiKeyId: integration.externalApiKeyId,
      },
      testPayload: payload || integration.defaultPayload || {},
    };
  }
}
