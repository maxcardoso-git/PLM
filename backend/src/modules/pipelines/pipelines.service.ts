import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePipelineDto, UpdatePipelineDto, ClonePipelineVersionDto, ClonePipelineDto } from './dto';
import { TenantContext } from '../../common/decorators';

// ISC (Interaction State Controller) States for Orchestrator integration
const ISC_STATES = [
  { value: 'INIT', label: 'Initial', description: 'Initial contact, greeting' },
  { value: 'IDENTIFICATION', label: 'Identification', description: 'Customer identification (CPF request)' },
  { value: 'DISCOVERY', label: 'Discovery', description: 'Understanding customer situation' },
  { value: 'VALIDATION', label: 'Validation', description: 'Validating customer identity' },
  { value: 'EVALUATION', label: 'Evaluation', description: 'Evaluating customer situation/eligibility' },
  { value: 'DECISION', label: 'Decision', description: 'Making decisions on proposals' },
  { value: 'NEGOTIATION', label: 'Negotiation', description: 'Negotiating terms' },
  { value: 'COMMITMENT', label: 'Commitment', description: 'Getting customer commitment' },
  { value: 'EXECUTION', label: 'Execution', description: 'Processing agreed actions' },
  { value: 'CONFIRMATION', label: 'Confirmation', description: 'Confirming completion' },
  { value: 'RESOLUTION', label: 'Resolution', description: 'Case resolved' },
  { value: 'FOLLOW_UP', label: 'Follow-up', description: 'Post-resolution follow-up' },
  { value: 'STALL', label: 'Stall', description: 'Customer asked to return later' },
  { value: 'EXIT', label: 'Exit', description: 'Conversation ended' },
  { value: 'CLOSED', label: 'Closed', description: 'Case closed' },
];

@Injectable()
export class PipelinesService {
  constructor(private prisma: PrismaService) {}

  getIscStates() {
    return { items: ISC_STATES };
  }

  async create(ctx: TenantContext, dto: CreatePipelineDto) {
    const existing = await this.prisma.pipeline.findFirst({
      where: {
        orgId: ctx.orgId!,
        key: dto.key,
      },
    });

    if (existing) {
      throw new ConflictException(`Pipeline with key "${dto.key}" already exists in this organization`);
    }

    return this.prisma.$transaction(async (tx) => {
      const pipeline = await tx.pipeline.create({
        data: {
          tenantId: ctx.tenantId,
          orgId: ctx.orgId!,
          key: dto.key,
          name: dto.name,
          description: dto.description,
          projectId: dto.projectId,
          projectName: dto.projectName,
          lifecycleStatus: 'draft',
          // Orchestrator domain integration
          domain: dto.domain,
          domainDescription: dto.domainDescription,
        },
      });

      const version = await tx.pipelineVersion.create({
        data: {
          pipelineId: pipeline.id,
          version: 1,
          status: 'draft',
        },
      });

      return {
        ...pipeline,
        latestVersion: version,
      };
    });
  }

  async findAll(ctx: TenantContext, lifecycleStatus?: string) {
    return this.prisma.pipeline.findMany({
      where: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId!,
        ...(lifecycleStatus && { lifecycleStatus: lifecycleStatus as any }),
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
        },
        _count: {
          select: {
            cards: {
              where: { status: 'active' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(ctx: TenantContext, id: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: {
        id,
        tenantId: ctx.tenantId,
        orgId: ctx.orgId!,
      },
      include: {
        versions: {
          orderBy: { version: 'desc' },
        },
        _count: {
          select: {
            cards: true,
          },
        },
      },
    });

    if (!pipeline) {
      throw new NotFoundException(`Pipeline ${id} not found`);
    }

    return pipeline;
  }

  async update(ctx: TenantContext, id: string, dto: UpdatePipelineDto) {
    const pipeline = await this.findOne(ctx, id);

    if (pipeline.lifecycleStatus === 'closed' || pipeline.lifecycleStatus === 'archived') {
      throw new BadRequestException('Cannot update closed or archived pipeline');
    }

    return this.prisma.pipeline.update({
      where: { id },
      data: dto,
    });
  }

  async close(ctx: TenantContext, id: string) {
    const pipeline = await this.findOne(ctx, id);

    if (pipeline.lifecycleStatus === 'closed') {
      throw new BadRequestException('Pipeline is already closed');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.pipeline.update({
        where: { id },
        data: { lifecycleStatus: 'closed' },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: ctx.tenantId,
          orgId: ctx.orgId!,
          eventType: 'PLM.PIPE.CLOSED',
          entityType: 'Pipeline',
          entityId: id,
          payload: { pipeline: updated },
          status: 'pending',
        },
      });

      return updated;
    });
  }

  async getVersions(ctx: TenantContext, pipelineId: string) {
    await this.findOne(ctx, pipelineId);

    return this.prisma.pipelineVersion.findMany({
      where: { pipelineId },
      include: {
        stages: {
          orderBy: { stageOrder: 'asc' },
        },
        _count: {
          select: { transitions: true },
        },
      },
      orderBy: { version: 'desc' },
    });
  }

  async getVersion(ctx: TenantContext, pipelineId: string, version: number) {
    await this.findOne(ctx, pipelineId);

    const pipelineVersion = await this.prisma.pipelineVersion.findFirst({
      where: { pipelineId, version },
      include: {
        stages: {
          orderBy: { stageOrder: 'asc' },
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
                toStage: { select: { id: true, name: true } },
              },
            },
          },
        },
        transitions: true,
      },
    });

    if (!pipelineVersion) {
      throw new NotFoundException(`Pipeline version ${version} not found`);
    }

    return pipelineVersion;
  }

  async cloneVersion(ctx: TenantContext, pipelineId: string, dto: ClonePipelineVersionDto) {
    const pipeline = await this.findOne(ctx, pipelineId);

    const sourceVersion = dto.fromVersion || pipeline.publishedVersion;
    if (!sourceVersion) {
      throw new BadRequestException('No source version specified and pipeline has no published version');
    }

    const source = await this.getVersion(ctx, pipelineId, sourceVersion);

    const latestVersion = await this.prisma.pipelineVersion.findFirst({
      where: { pipelineId },
      orderBy: { version: 'desc' },
    });

    const newVersionNumber = (latestVersion?.version || 0) + 1;

    return this.prisma.$transaction(async (tx) => {
      const newVersion = await tx.pipelineVersion.create({
        data: {
          pipelineId,
          version: newVersionNumber,
          status: dto.targetStatus || 'draft',
        },
      });

      const stageIdMap = new Map<string, string>();

      for (const stage of source.stages) {
        const newStage = await tx.stage.create({
          data: {
            pipelineVersionId: newVersion.id,
            name: stage.name,
            stageOrder: stage.stageOrder,
            classification: stage.classification,
            color: stage.color,
            isInitial: stage.isInitial,
            isFinal: stage.isFinal,
            wipLimit: stage.wipLimit,
            slaHours: stage.slaHours,
            active: stage.active,
          },
        });
        stageIdMap.set(stage.id, newStage.id);

        for (const rule of stage.formAttachRules) {
          await tx.stageFormAttachRule.create({
            data: {
              stageId: newStage.id,
              formDefinitionId: rule.formDefinitionId,
              defaultFormStatus: rule.defaultFormStatus,
              lockOnLeaveStage: rule.lockOnLeaveStage,
            },
          });
        }
      }

      for (const transition of source.transitions) {
        const newFromId = stageIdMap.get(transition.fromStageId);
        const newToId = stageIdMap.get(transition.toStageId);

        if (newFromId && newToId) {
          await tx.stageTransition.create({
            data: {
              pipelineVersionId: newVersion.id,
              fromStageId: newFromId,
              toStageId: newToId,
            },
          });
        }
      }

      return this.getVersion(ctx, pipelineId, newVersionNumber);
    });
  }

  async startTest(ctx: TenantContext, pipelineId: string, version: number) {
    const pipeline = await this.findOne(ctx, pipelineId);
    const pipelineVersion = await this.getVersion(ctx, pipelineId, version);

    if (pipelineVersion.status === 'published') {
      throw new BadRequestException('Cannot test a published version. Clone it first.');
    }

    if (pipelineVersion.status === 'test') {
      throw new BadRequestException('Version is already in test mode');
    }

    const initialStages = pipelineVersion.stages.filter((s) => s.isInitial);
    if (initialStages.length !== 1) {
      throw new BadRequestException('Pipeline version must have exactly one initial stage');
    }

    const finalStages = pipelineVersion.stages.filter((s) => s.isFinal);
    if (finalStages.length === 0) {
      throw new BadRequestException('Pipeline version must have at least one final stage');
    }

    return this.prisma.$transaction(async (tx) => {
      const updatedVersion = await tx.pipelineVersion.update({
        where: { id: pipelineVersion.id },
        data: {
          status: 'test',
        },
      });

      await tx.pipeline.update({
        where: { id: pipelineId },
        data: {
          lifecycleStatus: 'test',
          publishedVersion: version, // Set as published version temporarily for testing
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: ctx.tenantId,
          orgId: ctx.orgId!,
          eventType: 'PLM.PIPE.TEST_STARTED',
          entityType: 'Pipeline',
          entityId: pipelineId,
          payload: {
            pipelineId,
            version,
          },
          status: 'pending',
        },
      });

      return updatedVersion;
    });
  }

  async endTest(ctx: TenantContext, pipelineId: string, version: number, action: 'discard' | 'publish') {
    const pipeline = await this.findOne(ctx, pipelineId);
    const pipelineVersion = await this.getVersion(ctx, pipelineId, version);

    if (pipelineVersion.status !== 'test') {
      throw new BadRequestException('Version is not in test mode');
    }

    return this.prisma.$transaction(async (tx) => {
      // Delete all test cards created during testing
      const testCards = await tx.card.findMany({
        where: {
          pipelineId,
          pipelineVersion: version,
        },
        select: { id: true },
      });

      for (const card of testCards) {
        await tx.cardComment.deleteMany({ where: { cardId: card.id } });
        await tx.triggerExecution.deleteMany({ where: { cardId: card.id } });
        await tx.cardForm.deleteMany({ where: { cardId: card.id } });
        await tx.cardMoveHistory.deleteMany({ where: { cardId: card.id } });
        await tx.card.delete({ where: { id: card.id } });
      }

      if (action === 'publish') {
        // Publish the version
        const updatedVersion = await tx.pipelineVersion.update({
          where: { id: pipelineVersion.id },
          data: {
            status: 'published',
            publishedAt: new Date(),
          },
        });

        await tx.pipeline.update({
          where: { id: pipelineId },
          data: {
            lifecycleStatus: 'published',
            publishedVersion: version,
          },
        });

        await tx.outboxEvent.create({
          data: {
            tenantId: ctx.tenantId,
            orgId: ctx.orgId!,
            eventType: 'PLM.PIPE.PUBLISHED',
            entityType: 'Pipeline',
            entityId: pipelineId,
            payload: {
              pipelineId,
              version,
              fromTest: true,
            },
            status: 'pending',
          },
        });

        return { version: updatedVersion, cardsDeleted: testCards.length, action: 'published' };
      } else {
        // Discard - revert to draft
        const updatedVersion = await tx.pipelineVersion.update({
          where: { id: pipelineVersion.id },
          data: {
            status: 'draft',
          },
        });

        await tx.pipeline.update({
          where: { id: pipelineId },
          data: {
            lifecycleStatus: 'draft',
            publishedVersion: null,
          },
        });

        await tx.outboxEvent.create({
          data: {
            tenantId: ctx.tenantId,
            orgId: ctx.orgId!,
            eventType: 'PLM.PIPE.TEST_ENDED',
            entityType: 'Pipeline',
            entityId: pipelineId,
            payload: {
              pipelineId,
              version,
              action: 'discarded',
            },
            status: 'pending',
          },
        });

        return { version: updatedVersion, cardsDeleted: testCards.length, action: 'discarded' };
      }
    });
  }

  async publishVersion(ctx: TenantContext, pipelineId: string, version: number) {
    const pipeline = await this.findOne(ctx, pipelineId);
    const pipelineVersion = await this.getVersion(ctx, pipelineId, version);

    if (pipelineVersion.status === 'published') {
      throw new BadRequestException('Version is already published');
    }

    if (pipelineVersion.status === 'test') {
      throw new BadRequestException('Cannot publish a version that is in test mode. End the test first.');
    }

    const initialStages = pipelineVersion.stages.filter((s) => s.isInitial);
    if (initialStages.length !== 1) {
      throw new BadRequestException('Pipeline version must have exactly one initial stage');
    }

    const finalStages = pipelineVersion.stages.filter((s) => s.isFinal);
    if (finalStages.length === 0) {
      throw new BadRequestException('Pipeline version must have at least one final stage');
    }

    return this.prisma.$transaction(async (tx) => {
      if (pipeline.publishedVersion) {
        await tx.pipelineVersion.updateMany({
          where: { pipelineId, status: 'published' },
          data: { status: 'archived' },
        });
      }

      const updatedVersion = await tx.pipelineVersion.update({
        where: { id: pipelineVersion.id },
        data: {
          status: 'published',
          publishedAt: new Date(),
        },
      });

      await tx.pipeline.update({
        where: { id: pipelineId },
        data: {
          publishedVersion: version,
          lifecycleStatus: 'published',
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: ctx.tenantId,
          orgId: ctx.orgId!,
          eventType: 'PLM.PIPE.PUBLISHED',
          entityType: 'Pipeline',
          entityId: pipelineId,
          payload: {
            pipelineId,
            version,
          },
          status: 'pending',
        },
      });

      return updatedVersion;
    });
  }

  async unpublishVersion(ctx: TenantContext, pipelineId: string, version: number) {
    const pipeline = await this.findOne(ctx, pipelineId);
    const pipelineVersion = await this.getVersion(ctx, pipelineId, version);

    if (pipelineVersion.status !== 'published') {
      throw new BadRequestException('Version is not published');
    }

    // Check if there are active cards using this version
    const activeCardsCount = await this.prisma.card.count({
      where: {
        pipelineId,
        status: 'active',
      },
    });

    if (activeCardsCount > 0) {
      throw new BadRequestException(
        `Cannot unpublish: there are ${activeCardsCount} active cards in this pipeline. Archive or move them first.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Revert version to draft
      const updatedVersion = await tx.pipelineVersion.update({
        where: { id: pipelineVersion.id },
        data: {
          status: 'draft',
          publishedAt: null,
        },
      });

      // Clear published version from pipeline
      await tx.pipeline.update({
        where: { id: pipelineId },
        data: {
          publishedVersion: null,
          lifecycleStatus: 'draft',
        },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: ctx.tenantId,
          orgId: ctx.orgId!,
          eventType: 'PLM.PIPE.UNPUBLISHED',
          entityType: 'Pipeline',
          entityId: pipelineId,
          payload: {
            pipelineId,
            version,
          },
          status: 'pending',
        },
      });

      return updatedVersion;
    });
  }

  async delete(ctx: TenantContext, id: string) {
    const pipeline = await this.findOne(ctx, id);

    // Check if there are active cards using this pipeline
    const activeCardsCount = await this.prisma.card.count({
      where: {
        pipelineId: id,
        status: 'active',
      },
    });

    if (activeCardsCount > 0) {
      throw new BadRequestException(
        `Cannot delete: there are ${activeCardsCount} active cards in this pipeline. Archive or delete them first.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // Delete all cards (archived ones)
      await tx.card.deleteMany({
        where: { pipelineId: id },
      });

      // Delete pipeline (cascade will handle versions, stages, transitions, etc.)
      await tx.pipeline.delete({
        where: { id },
      });

      await tx.outboxEvent.create({
        data: {
          tenantId: ctx.tenantId,
          orgId: ctx.orgId!,
          eventType: 'PLM.PIPE.DELETED',
          entityType: 'Pipeline',
          entityId: id,
          payload: { pipelineId: id, pipelineName: pipeline.name },
          status: 'pending',
        },
      });

      return { deleted: true, id };
    });
  }

  async clonePipeline(ctx: TenantContext, sourcePipelineId: string, dto: ClonePipelineDto) {
    // Check if the source pipeline exists
    const sourcePipeline = await this.findOne(ctx, sourcePipelineId);

    // Check if the new key already exists
    const existingWithKey = await this.prisma.pipeline.findFirst({
      where: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId!,
        key: dto.newKey,
      },
    });

    if (existingWithKey) {
      throw new ConflictException(`Pipeline with key "${dto.newKey}" already exists in this organization`);
    }

    // Determine which version to clone
    const versionToClone = dto.fromVersion || sourcePipeline.publishedVersion || 1;

    // Get the source version with all its data
    const sourceVersion = await this.prisma.pipelineVersion.findFirst({
      where: {
        pipelineId: sourcePipelineId,
        version: versionToClone,
      },
      include: {
        stages: {
          include: {
            formAttachRules: true,
            triggers: {
              include: {
                conditions: true,
              },
            },
          },
          orderBy: { stageOrder: 'asc' },
        },
        transitions: {
          include: {
            rules: true,
          },
        },
      },
    });

    if (!sourceVersion) {
      throw new NotFoundException(`Version ${versionToClone} not found in source pipeline`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Create the new pipeline (always as draft)
      const newPipeline = await tx.pipeline.create({
        data: {
          tenantId: ctx.tenantId,
          orgId: ctx.orgId!,
          key: dto.newKey,
          name: dto.newName || `${sourcePipeline.name} (Cópia)`,
          description: sourcePipeline.description,
          projectId: sourcePipeline.projectId,
          projectName: sourcePipeline.projectName,
          domain: sourcePipeline.domain,
          domainDescription: sourcePipeline.domainDescription,
          lifecycleStatus: 'draft', // Always draft
          publishedVersion: null, // Not published
        },
      });

      // Create version 1 (draft)
      const newVersion = await tx.pipelineVersion.create({
        data: {
          pipelineId: newPipeline.id,
          version: 1,
          status: 'draft',
        },
      });

      // Map old stage IDs to new stage IDs
      const stageIdMap = new Map<string, string>();

      // Clone stages
      for (const stage of sourceVersion.stages) {
        const newStage = await tx.stage.create({
          data: {
            pipelineVersionId: newVersion.id,
            key: stage.key,
            name: stage.name,
            stageOrder: stage.stageOrder,
            classification: stage.classification,
            color: stage.color,
            isInitial: stage.isInitial,
            isFinal: stage.isFinal,
            wipLimit: stage.wipLimit,
            slaHours: stage.slaHours,
            active: stage.active,
            // Orchestrator ISC fields
            iscStates: stage.iscStates as any,
            stageStrategy: stage.stageStrategy,
          },
        });

        stageIdMap.set(stage.id, newStage.id);

        // Clone form attach rules
        for (const rule of stage.formAttachRules) {
          await tx.stageFormAttachRule.create({
            data: {
              stageId: newStage.id,
              formDefinitionId: rule.formDefinitionId,
              externalFormId: rule.externalFormId,
              externalFormName: rule.externalFormName,
              externalFormVersion: rule.externalFormVersion,
              defaultFormStatus: rule.defaultFormStatus,
              lockOnLeaveStage: rule.lockOnLeaveStage,
              uniqueKeyFieldId: rule.uniqueKeyFieldId,
            },
          });
        }

        // Clone triggers
        for (const trigger of stage.triggers) {
          // Map fromStageId to new stage ID if it exists
          const newFromStageId = trigger.fromStageId ? stageIdMap.get(trigger.fromStageId) : null;

          const newTrigger = await tx.stageTrigger.create({
            data: {
              stageId: newStage.id,
              integrationId: trigger.integrationId,
              eventType: trigger.eventType,
              fromStageId: newFromStageId || null,
              formDefinitionId: trigger.formDefinitionId,
              externalFormId: trigger.externalFormId,
              externalFormName: trigger.externalFormName,
              fieldId: trigger.fieldId,
              executionOrder: trigger.executionOrder,
              enabled: trigger.enabled,
            },
          });

          // Clone trigger conditions
          for (const condition of trigger.conditions) {
            await tx.stageTriggerCondition.create({
              data: {
                triggerId: newTrigger.id,
                fieldPath: condition.fieldPath,
                operator: condition.operator,
                value: condition.value,
              },
            });
          }
        }
      }

      // Clone transitions
      for (const transition of sourceVersion.transitions) {
        const newFromId = stageIdMap.get(transition.fromStageId);
        const newToId = stageIdMap.get(transition.toStageId);

        if (newFromId && newToId) {
          const newTransition = await tx.stageTransition.create({
            data: {
              pipelineVersionId: newVersion.id,
              fromStageId: newFromId,
              toStageId: newToId,
            },
          });

          // Clone transition rules
          for (const rule of transition.rules) {
            await tx.stageTransitionRule.create({
              data: {
                transitionId: newTransition.id,
                ruleType: rule.ruleType,
                formDefinitionId: rule.formDefinitionId,
                enabled: rule.enabled,
              },
            });
          }
        }
      }

      // Create outbox event
      await tx.outboxEvent.create({
        data: {
          tenantId: ctx.tenantId,
          orgId: ctx.orgId!,
          eventType: 'PLM.PIPE.CLONED',
          entityType: 'Pipeline',
          entityId: newPipeline.id,
          payload: {
            sourcePipelineId,
            sourcePipelineName: sourcePipeline.name,
            newPipelineId: newPipeline.id,
            newPipelineName: newPipeline.name,
            clonedFromVersion: versionToClone,
          },
          status: 'pending',
        },
      });

      return {
        ...newPipeline,
        latestVersion: newVersion,
        clonedFrom: {
          pipelineId: sourcePipelineId,
          pipelineName: sourcePipeline.name,
          version: versionToClone,
        },
      };
    });
  }
}
