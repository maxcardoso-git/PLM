import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  CreateStageDto,
  UpdateStageDto,
  CreateTransitionDto,
  AttachFormDto,
  CreateTransitionRuleDto,
  UpdateTransitionRuleDto,
} from './dto';
import { TenantContext } from '../../common/decorators';

@Injectable()
export class StagesService {
  constructor(private prisma: PrismaService) {}

  private async validateVersionAccess(ctx: TenantContext, pipelineId: string, version: number) {
    const pipelineVersion = await this.prisma.pipelineVersion.findFirst({
      where: {
        pipelineId,
        version,
        pipeline: {
          tenantId: ctx.tenantId,
          orgId: ctx.orgId,
        },
      },
    });

    if (!pipelineVersion) {
      throw new NotFoundException('Pipeline version not found');
    }

    if (pipelineVersion.status === 'published' || pipelineVersion.status === 'archived') {
      throw new BadRequestException('Cannot modify published or archived version');
    }

    return pipelineVersion;
  }

  async create(ctx: TenantContext, pipelineId: string, version: number, dto: CreateStageDto) {
    const pipelineVersion = await this.validateVersionAccess(ctx, pipelineId, version);

    if (dto.isInitial) {
      const existingInitial = await this.prisma.stage.findFirst({
        where: { pipelineVersionId: pipelineVersion.id, isInitial: true },
      });
      if (existingInitial) {
        throw new ConflictException('Pipeline version already has an initial stage');
      }
    }

    return this.prisma.stage.create({
      data: {
        pipelineVersionId: pipelineVersion.id,
        ...dto,
      },
    });
  }

  async findAll(ctx: TenantContext, pipelineId: string, version: number) {
    const pipelineVersion = await this.prisma.pipelineVersion.findFirst({
      where: {
        pipelineId,
        version,
        pipeline: {
          tenantId: ctx.tenantId,
          orgId: ctx.orgId,
        },
      },
    });

    if (!pipelineVersion) {
      throw new NotFoundException('Pipeline version not found');
    }

    return this.prisma.stage.findMany({
      where: { pipelineVersionId: pipelineVersion.id },
      include: {
        formAttachRules: {
          include: {
            formDefinition: {
              select: { id: true, name: true, version: true },
            },
          },
        },
        transitionsFrom: {
          include: {
            toStage: { select: { id: true, name: true, color: true } },
          },
        },
        triggers: {
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
        },
        _count: {
          select: { cards: { where: { status: 'active' } } },
        },
      },
      orderBy: { stageOrder: 'asc' },
    });
  }

  async update(ctx: TenantContext, stageId: string, dto: UpdateStageDto) {
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

    if (!stage) {
      throw new NotFoundException('Stage not found');
    }

    if (stage.pipelineVersion.pipeline.tenantId !== ctx.tenantId) {
      throw new NotFoundException('Stage not found');
    }

    if (stage.pipelineVersion.status === 'published' || stage.pipelineVersion.status === 'archived') {
      throw new BadRequestException('Cannot modify stages of published or archived version');
    }

    if (dto.isInitial) {
      const existingInitial = await this.prisma.stage.findFirst({
        where: {
          pipelineVersionId: stage.pipelineVersionId,
          isInitial: true,
          id: { not: stageId },
        },
      });
      if (existingInitial) {
        throw new ConflictException('Pipeline version already has an initial stage');
      }
    }

    return this.prisma.stage.update({
      where: { id: stageId },
      data: dto,
    });
  }

  async delete(ctx: TenantContext, stageId: string) {
    const stage = await this.prisma.stage.findFirst({
      where: { id: stageId },
      include: {
        pipelineVersion: {
          include: { pipeline: true },
        },
        _count: {
          select: { cards: true },
        },
      },
    });

    if (!stage) {
      throw new NotFoundException('Stage not found');
    }

    if (stage.pipelineVersion.pipeline.tenantId !== ctx.tenantId) {
      throw new NotFoundException('Stage not found');
    }

    if (stage.pipelineVersion.status === 'published' || stage.pipelineVersion.status === 'archived') {
      throw new BadRequestException('Cannot delete stages from published or archived version');
    }

    if (stage._count.cards > 0) {
      throw new BadRequestException('Cannot delete stage with cards');
    }

    return this.prisma.stage.delete({ where: { id: stageId } });
  }

  async createTransition(ctx: TenantContext, pipelineId: string, version: number, dto: CreateTransitionDto) {
    const pipelineVersion = await this.validateVersionAccess(ctx, pipelineId, version);

    const [fromStage, toStage] = await Promise.all([
      this.prisma.stage.findFirst({
        where: { id: dto.fromStageId, pipelineVersionId: pipelineVersion.id },
      }),
      this.prisma.stage.findFirst({
        where: { id: dto.toStageId, pipelineVersionId: pipelineVersion.id },
      }),
    ]);

    if (!fromStage || !toStage) {
      throw new BadRequestException('Both stages must belong to the same pipeline version');
    }

    if (dto.fromStageId === dto.toStageId) {
      throw new BadRequestException('Cannot create self-transition');
    }

    const existing = await this.prisma.stageTransition.findFirst({
      where: {
        fromStageId: dto.fromStageId,
        toStageId: dto.toStageId,
      },
    });

    if (existing) {
      throw new ConflictException('Transition already exists');
    }

    return this.prisma.stageTransition.create({
      data: {
        pipelineVersionId: pipelineVersion.id,
        fromStageId: dto.fromStageId,
        toStageId: dto.toStageId,
      },
      include: {
        fromStage: { select: { id: true, name: true } },
        toStage: { select: { id: true, name: true } },
      },
    });
  }

  async getTransitions(ctx: TenantContext, pipelineId: string, version: number) {
    const pipelineVersion = await this.prisma.pipelineVersion.findFirst({
      where: {
        pipelineId,
        version,
        pipeline: {
          tenantId: ctx.tenantId,
          orgId: ctx.orgId,
        },
      },
    });

    if (!pipelineVersion) {
      throw new NotFoundException('Pipeline version not found');
    }

    return this.prisma.stageTransition.findMany({
      where: { pipelineVersionId: pipelineVersion.id },
      include: {
        fromStage: { select: { id: true, name: true, color: true } },
        toStage: { select: { id: true, name: true, color: true } },
      },
    });
  }

  async deleteTransition(ctx: TenantContext, transitionId: string) {
    const transition = await this.prisma.stageTransition.findFirst({
      where: { id: transitionId },
      include: {
        pipelineVersion: {
          include: { pipeline: true },
        },
      },
    });

    if (!transition) {
      throw new NotFoundException('Transition not found');
    }

    if (transition.pipelineVersion.pipeline.tenantId !== ctx.tenantId) {
      throw new NotFoundException('Transition not found');
    }

    if (transition.pipelineVersion.status === 'published') {
      throw new BadRequestException('Cannot delete transitions from published version');
    }

    return this.prisma.stageTransition.delete({ where: { id: transitionId } });
  }

  async attachForm(ctx: TenantContext, stageId: string, dto: AttachFormDto) {
    const stage = await this.prisma.stage.findFirst({
      where: { id: stageId },
      include: {
        pipelineVersion: {
          include: { pipeline: true },
        },
      },
    });

    if (!stage) {
      throw new NotFoundException('Stage not found');
    }

    if (stage.pipelineVersion.pipeline.tenantId !== ctx.tenantId) {
      throw new NotFoundException('Stage not found');
    }

    if (stage.pipelineVersion.status === 'published') {
      throw new BadRequestException('Cannot modify published version');
    }

    // Must provide either local form or external form
    if (!dto.formDefinitionId && !dto.externalFormId) {
      throw new BadRequestException('Either formDefinitionId or externalFormId is required');
    }

    // If using local form, validate it exists
    if (dto.formDefinitionId) {
      const formDef = await this.prisma.formDefinition.findFirst({
        where: {
          id: dto.formDefinitionId,
          tenantId: ctx.tenantId,
          status: 'published',
        },
      });

      if (!formDef) {
        throw new NotFoundException('Form definition not found or not published');
      }

      const existing = await this.prisma.stageFormAttachRule.findFirst({
        where: {
          stageId,
          formDefinitionId: dto.formDefinitionId,
        },
      });

      if (existing) {
        throw new ConflictException('Form is already attached to this stage');
      }

      return this.prisma.stageFormAttachRule.create({
        data: {
          stageId,
          formDefinitionId: dto.formDefinitionId,
          defaultFormStatus: dto.defaultFormStatus,
          lockOnLeaveStage: dto.lockOnLeaveStage || false,
        },
        include: {
          formDefinition: {
            select: { id: true, name: true, version: true },
          },
        },
      });
    }

    // External form - validate required fields and check duplicates
    if (!dto.externalFormName) {
      throw new BadRequestException('externalFormName is required for external forms');
    }

    const existingExternal = await this.prisma.stageFormAttachRule.findFirst({
      where: {
        stageId,
        externalFormId: dto.externalFormId,
      },
    });

    if (existingExternal) {
      throw new ConflictException('External form is already attached to this stage');
    }

    return this.prisma.stageFormAttachRule.create({
      data: {
        stageId,
        externalFormId: dto.externalFormId,
        externalFormName: dto.externalFormName,
        externalFormVersion: dto.externalFormVersion,
        defaultFormStatus: dto.defaultFormStatus,
        lockOnLeaveStage: dto.lockOnLeaveStage || false,
      },
    });
  }

  async detachForm(ctx: TenantContext, ruleId: string) {
    const rule = await this.prisma.stageFormAttachRule.findFirst({
      where: { id: ruleId },
      include: {
        stage: {
          include: {
            pipelineVersion: {
              include: { pipeline: true },
            },
          },
        },
      },
    });

    if (!rule) {
      throw new NotFoundException('Attach rule not found');
    }

    if (rule.stage.pipelineVersion.pipeline.tenantId !== ctx.tenantId) {
      throw new NotFoundException('Attach rule not found');
    }

    if (rule.stage.pipelineVersion.status === 'published') {
      throw new BadRequestException('Cannot modify published version');
    }

    return this.prisma.stageFormAttachRule.delete({ where: { id: ruleId } });
  }

  // ============================================
  // Transition Rules
  // ============================================

  private async validateTransitionAccess(ctx: TenantContext, transitionId: string) {
    const transition = await this.prisma.stageTransition.findFirst({
      where: { id: transitionId },
      include: {
        pipelineVersion: {
          include: { pipeline: true },
        },
        fromStage: { select: { id: true, name: true } },
        toStage: { select: { id: true, name: true } },
      },
    });

    if (!transition) {
      throw new NotFoundException('Transition not found');
    }

    if (transition.pipelineVersion.pipeline.tenantId !== ctx.tenantId) {
      throw new NotFoundException('Transition not found');
    }

    return transition;
  }

  async getTransitionRules(ctx: TenantContext, transitionId: string) {
    await this.validateTransitionAccess(ctx, transitionId);

    return this.prisma.stageTransitionRule.findMany({
      where: { transitionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async createTransitionRule(ctx: TenantContext, transitionId: string, dto: CreateTransitionRuleDto) {
    const transition = await this.validateTransitionAccess(ctx, transitionId);

    if (transition.pipelineVersion.status === 'published' || transition.pipelineVersion.status === 'archived') {
      throw new BadRequestException('Cannot modify rules on published or archived version');
    }

    // formDefinitionId is optional for FORM_REQUIRED - if not provided, validates all forms

    // Check for duplicate rules
    const existing = await this.prisma.stageTransitionRule.findFirst({
      where: {
        transitionId,
        ruleType: dto.ruleType as any,
        ...(dto.formDefinitionId && { formDefinitionId: dto.formDefinitionId }),
      },
    });

    if (existing) {
      throw new ConflictException('This rule already exists for this transition');
    }

    return this.prisma.stageTransitionRule.create({
      data: {
        transitionId,
        ruleType: dto.ruleType as any,
        formDefinitionId: dto.formDefinitionId,
        enabled: dto.enabled ?? true,
      },
    });
  }

  async updateTransitionRule(ctx: TenantContext, ruleId: string, dto: UpdateTransitionRuleDto) {
    const rule = await this.prisma.stageTransitionRule.findFirst({
      where: { id: ruleId },
      include: {
        transition: {
          include: {
            pipelineVersion: {
              include: { pipeline: true },
            },
          },
        },
      },
    });

    if (!rule) {
      throw new NotFoundException('Transition rule not found');
    }

    if (rule.transition.pipelineVersion.pipeline.tenantId !== ctx.tenantId) {
      throw new NotFoundException('Transition rule not found');
    }

    if (rule.transition.pipelineVersion.status === 'published' || rule.transition.pipelineVersion.status === 'archived') {
      throw new BadRequestException('Cannot modify rules on published or archived version');
    }

    return this.prisma.stageTransitionRule.update({
      where: { id: ruleId },
      data: dto,
    });
  }

  async deleteTransitionRule(ctx: TenantContext, ruleId: string) {
    const rule = await this.prisma.stageTransitionRule.findFirst({
      where: { id: ruleId },
      include: {
        transition: {
          include: {
            pipelineVersion: {
              include: { pipeline: true },
            },
          },
        },
      },
    });

    if (!rule) {
      throw new NotFoundException('Transition rule not found');
    }

    if (rule.transition.pipelineVersion.pipeline.tenantId !== ctx.tenantId) {
      throw new NotFoundException('Transition rule not found');
    }

    if (rule.transition.pipelineVersion.status === 'published' || rule.transition.pipelineVersion.status === 'archived') {
      throw new BadRequestException('Cannot delete rules from published or archived version');
    }

    await this.prisma.stageTransitionRule.delete({ where: { id: ruleId } });
    return { deleted: true, id: ruleId };
  }
}
