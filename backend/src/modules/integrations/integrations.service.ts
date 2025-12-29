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
    await this.findOne(ctx, id);

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
