import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePlmApiKeyDto, UpdatePlmApiKeyDto } from './dto';
import type { TenantContext } from '../../common/decorators';
import * as crypto from 'crypto';

@Injectable()
export class PlmApiKeysService {
  constructor(private readonly prisma: PrismaService) {}

  private generateApiKey(): string {
    // Generate a secure API key: plm_sk_<32 random hex chars>
    const randomBytes = crypto.randomBytes(24);
    return `plm_sk_${randomBytes.toString('hex')}`;
  }

  async create(ctx: TenantContext, dto: CreatePlmApiKeyDto) {
    const key = this.generateApiKey();

    return this.prisma.plmApiKey.create({
      data: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId!,
        name: dto.name,
        key,
        description: dto.description,
        permissions: dto.permissions,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      },
      select: {
        id: true,
        name: true,
        key: true, // Only returned on creation!
        description: true,
        permissions: true,
        enabled: true,
        expiresAt: true,
        createdAt: true,
      },
    });
  }

  async findAll(ctx: TenantContext) {
    return this.prisma.plmApiKey.findMany({
      where: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId!,
      },
      select: {
        id: true,
        name: true,
        // Key is masked - only show first 12 and last 4 chars
        key: true,
        description: true,
        permissions: true,
        enabled: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(ctx: TenantContext, id: string) {
    const apiKey = await this.prisma.plmApiKey.findFirst({
      where: {
        id,
        tenantId: ctx.tenantId,
        orgId: ctx.orgId!,
      },
      select: {
        id: true,
        name: true,
        key: true,
        description: true,
        permissions: true,
        enabled: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!apiKey) {
      throw new NotFoundException('API Key not found');
    }

    return apiKey;
  }

  async update(ctx: TenantContext, id: string, dto: UpdatePlmApiKeyDto) {
    const existing = await this.findOne(ctx, id);

    return this.prisma.plmApiKey.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.permissions && { permissions: dto.permissions }),
        ...(dto.enabled !== undefined && { enabled: dto.enabled }),
        ...(dto.expiresAt !== undefined && {
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
        }),
      },
      select: {
        id: true,
        name: true,
        description: true,
        permissions: true,
        enabled: true,
        expiresAt: true,
        lastUsedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  async delete(ctx: TenantContext, id: string) {
    await this.findOne(ctx, id);

    await this.prisma.plmApiKey.delete({
      where: { id },
    });

    return { deleted: true, id };
  }

  async regenerate(ctx: TenantContext, id: string) {
    await this.findOne(ctx, id);

    const newKey = this.generateApiKey();

    return this.prisma.plmApiKey.update({
      where: { id },
      data: { key: newKey },
      select: {
        id: true,
        name: true,
        key: true, // Return new key
        description: true,
        permissions: true,
        enabled: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  // Used by ApiKeyGuard
  async validateKey(key: string): Promise<{
    id: string;
    tenantId: string;
    orgId: string;
    name: string;
    permissions: string[];
    expiresAt: Date | null;
  } | null> {
    const apiKey = await this.prisma.plmApiKey.findFirst({
      where: {
        key,
        enabled: true,
      },
      select: {
        id: true,
        tenantId: true,
        orgId: true,
        name: true,
        permissions: true,
        expiresAt: true,
      },
    });

    if (apiKey) {
      // Update last used timestamp
      await this.prisma.plmApiKey.update({
        where: { id: apiKey.id },
        data: { lastUsedAt: new Date() },
      });
    }

    return apiKey;
  }

  // Mask API key for display
  maskKey(key: string): string {
    if (key.length <= 16) return key;
    return `${key.substring(0, 12)}...${key.substring(key.length - 4)}`;
  }
}
