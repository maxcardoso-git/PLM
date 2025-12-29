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

  /**
   * Find pipelines that have the specified form attached to any of their stages.
   * This works with both internal form IDs and external form IDs (for imported forms).
   */
  async findLinkedPipelines(ctx: TenantContext, formId: string) {
    // Find all stage-form attach rules for this form
    const attachRules = await this.prisma.stageFormAttachRule.findMany({
      where: {
        formDefinitionId: formId,
      },
      include: {
        stage: {
          include: {
            pipelineVersion: {
              include: {
                pipeline: {
                  select: {
                    id: true,
                    key: true,
                    name: true,
                    tenantId: true,
                    orgId: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    // Filter by tenant and collect unique pipelines with their stages
    const pipelineMap = new Map<string, {
      pipeline: { id: string; key: string; name: string };
      stages: { id: string; name: string; versionNumber: number }[];
    }>();

    for (const rule of attachRules) {
      const pipeline = rule.stage.pipelineVersion.pipeline;

      // Filter by tenant
      if (pipeline.tenantId !== ctx.tenantId) continue;
      if (ctx.orgId && pipeline.orgId !== ctx.orgId) continue;

      if (!pipelineMap.has(pipeline.id)) {
        pipelineMap.set(pipeline.id, {
          pipeline: { id: pipeline.id, key: pipeline.key, name: pipeline.name },
          stages: [],
        });
      }

      pipelineMap.get(pipeline.id)!.stages.push({
        id: rule.stage.id,
        name: rule.stage.name,
        versionNumber: rule.stage.pipelineVersion.version,
      });
    }

    return Array.from(pipelineMap.values());
  }
}
