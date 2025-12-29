import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateStageTriggerDto, UpdateStageTriggerDto, AddConditionDto, TriggerEventType } from './dto';
import { TenantContext } from '../../common/decorators';

@Injectable()
export class StageTriggersService {
  constructor(private prisma: PrismaService) {}

  async create(ctx: TenantContext, stageId: string, dto: CreateStageTriggerDto) {
    // Verify stage exists and belongs to tenant
    const stage = await this.prisma.stage.findFirst({
      where: { id: stageId },
      include: {
        pipelineVersion: {
          include: {
            pipeline: true,
          },
        },
      },
    });

    if (!stage || stage.pipelineVersion.pipeline.tenantId !== ctx.tenantId) {
      throw new NotFoundException(`Stage ${stageId} not found`);
    }

    // Verify integration exists and belongs to tenant/org
    const integration = await this.prisma.integration.findFirst({
      where: {
        id: dto.integrationId,
        tenantId: ctx.tenantId,
        orgId: ctx.orgId!,
      },
    });

    if (!integration) {
      throw new NotFoundException(`Integration ${dto.integrationId} not found`);
    }

    // Validate form field change event has formDefinitionId
    if (dto.eventType === TriggerEventType.FORM_FIELD_CHANGE && !dto.formDefinitionId) {
      throw new BadRequestException('formDefinitionId is required for FORM_FIELD_CHANGE events');
    }

    // Create trigger with conditions
    const trigger = await this.prisma.stageTrigger.create({
      data: {
        stageId,
        integrationId: dto.integrationId,
        eventType: dto.eventType,
        fromStageId: dto.fromStageId,
        formDefinitionId: dto.formDefinitionId,
        fieldId: dto.fieldId,
        executionOrder: dto.executionOrder ?? 0,
        enabled: dto.enabled ?? true,
        conditions: dto.conditions?.length
          ? {
              create: dto.conditions.map((c) => ({
                fieldPath: c.fieldPath,
                operator: c.operator,
                value: c.value,
              })),
            }
          : undefined,
      },
      include: {
        integration: {
          select: { id: true, name: true, key: true },
        },
        fromStage: {
          select: { id: true, name: true },
        },
        formDefinition: {
          select: { id: true, name: true },
        },
        conditions: true,
      },
    });

    return trigger;
  }

  async findAllByStage(ctx: TenantContext, stageId: string) {
    // Verify stage exists
    const stage = await this.prisma.stage.findFirst({
      where: { id: stageId },
      include: {
        pipelineVersion: {
          include: {
            pipeline: true,
          },
        },
      },
    });

    if (!stage || stage.pipelineVersion.pipeline.tenantId !== ctx.tenantId) {
      throw new NotFoundException(`Stage ${stageId} not found`);
    }

    return this.prisma.stageTrigger.findMany({
      where: { stageId },
      include: {
        integration: {
          select: { id: true, name: true, key: true },
        },
        fromStage: {
          select: { id: true, name: true },
        },
        formDefinition: {
          select: { id: true, name: true },
        },
        conditions: true,
      },
      orderBy: { executionOrder: 'asc' },
    });
  }

  async findOne(ctx: TenantContext, triggerId: string) {
    const trigger = await this.prisma.stageTrigger.findFirst({
      where: { id: triggerId },
      include: {
        stage: {
          include: {
            pipelineVersion: {
              include: {
                pipeline: true,
              },
            },
          },
        },
        integration: {
          select: { id: true, name: true, key: true },
        },
        fromStage: {
          select: { id: true, name: true },
        },
        formDefinition: {
          select: { id: true, name: true },
        },
        conditions: true,
      },
    });

    if (!trigger || trigger.stage.pipelineVersion.pipeline.tenantId !== ctx.tenantId) {
      throw new NotFoundException(`Trigger ${triggerId} not found`);
    }

    return trigger;
  }

  async update(ctx: TenantContext, triggerId: string, dto: UpdateStageTriggerDto) {
    await this.findOne(ctx, triggerId);

    // If updating integrationId, verify it exists
    if (dto.integrationId) {
      const integration = await this.prisma.integration.findFirst({
        where: {
          id: dto.integrationId,
          tenantId: ctx.tenantId,
          orgId: ctx.orgId!,
        },
      });

      if (!integration) {
        throw new NotFoundException(`Integration ${dto.integrationId} not found`);
      }
    }

    return this.prisma.stageTrigger.update({
      where: { id: triggerId },
      data: {
        integrationId: dto.integrationId,
        eventType: dto.eventType,
        fromStageId: dto.fromStageId,
        formDefinitionId: dto.formDefinitionId,
        fieldId: dto.fieldId,
        executionOrder: dto.executionOrder,
        enabled: dto.enabled,
      },
      include: {
        integration: {
          select: { id: true, name: true, key: true },
        },
        fromStage: {
          select: { id: true, name: true },
        },
        formDefinition: {
          select: { id: true, name: true },
        },
        conditions: true,
      },
    });
  }

  async delete(ctx: TenantContext, triggerId: string) {
    await this.findOne(ctx, triggerId);

    await this.prisma.stageTrigger.delete({
      where: { id: triggerId },
    });

    return { deleted: true, id: triggerId };
  }

  async addCondition(ctx: TenantContext, triggerId: string, dto: AddConditionDto) {
    await this.findOne(ctx, triggerId);

    return this.prisma.stageTriggerCondition.create({
      data: {
        triggerId,
        fieldPath: dto.fieldPath,
        operator: dto.operator,
        value: dto.value,
      },
    });
  }

  async removeCondition(ctx: TenantContext, conditionId: string) {
    const condition = await this.prisma.stageTriggerCondition.findFirst({
      where: { id: conditionId },
      include: {
        trigger: {
          include: {
            stage: {
              include: {
                pipelineVersion: {
                  include: {
                    pipeline: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!condition || condition.trigger.stage.pipelineVersion.pipeline.tenantId !== ctx.tenantId) {
      throw new NotFoundException(`Condition ${conditionId} not found`);
    }

    await this.prisma.stageTriggerCondition.delete({
      where: { id: conditionId },
    });

    return { deleted: true, id: conditionId };
  }
}
