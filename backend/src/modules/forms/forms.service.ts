import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateFormDefinitionDto, UpdateFormDefinitionDto } from './dto';
import { TenantContext } from '../../common/decorators';

@Injectable()
export class FormsService {
  constructor(private prisma: PrismaService) {}

  async create(ctx: TenantContext, dto: CreateFormDefinitionDto) {
    return this.prisma.formDefinition.create({
      data: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId!,
        name: dto.name,
        version: dto.version || 1,
        schemaJson: dto.schemaJson,
        status: 'draft',
      },
    });
  }

  async findAll(ctx: TenantContext, status?: string) {
    return this.prisma.formDefinition.findMany({
      where: {
        tenantId: ctx.tenantId,
        OR: [
          { orgId: ctx.orgId },
          { orgId: null },
        ],
        ...(status && { status: status as any }),
      },
      orderBy: [{ name: 'asc' }, { version: 'desc' }],
    });
  }

  async findOne(ctx: TenantContext, id: string) {
    const form = await this.prisma.formDefinition.findFirst({
      where: {
        id,
        tenantId: ctx.tenantId,
      },
    });

    if (!form) {
      throw new NotFoundException(`Form ${id} not found`);
    }

    return form;
  }

  async update(ctx: TenantContext, id: string, dto: UpdateFormDefinitionDto) {
    const form = await this.findOne(ctx, id);

    if (form.status === 'published') {
      throw new BadRequestException('Cannot update published form. Create a new version instead.');
    }

    return this.prisma.formDefinition.update({
      where: { id },
      data: dto,
    });
  }

  async publish(ctx: TenantContext, id: string) {
    const form = await this.findOne(ctx, id);

    if (form.status === 'published') {
      throw new BadRequestException('Form is already published');
    }

    return this.prisma.formDefinition.update({
      where: { id },
      data: { status: 'published' },
    });
  }

  async archive(ctx: TenantContext, id: string) {
    const form = await this.findOne(ctx, id);

    return this.prisma.formDefinition.update({
      where: { id },
      data: { status: 'archived' },
    });
  }

  async createNewVersion(ctx: TenantContext, id: string, dto: UpdateFormDefinitionDto) {
    const form = await this.findOne(ctx, id);

    const latestVersion = await this.prisma.formDefinition.findFirst({
      where: {
        tenantId: ctx.tenantId,
        orgId: form.orgId,
        name: form.name,
      },
      orderBy: { version: 'desc' },
    });

    return this.prisma.formDefinition.create({
      data: {
        tenantId: ctx.tenantId,
        orgId: form.orgId,
        name: form.name,
        version: (latestVersion?.version || 0) + 1,
        schemaJson: dto.schemaJson || form.schemaJson || {},
        status: 'draft',
      },
    });
  }
}
