import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePipelineDto, UpdatePipelineDto, ClonePipelineVersionDto } from './dto';
import { TenantContext } from '../../common/decorators';

@Injectable()
export class PipelinesService {
  constructor(private prisma: PrismaService) {}

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

    if (pipelineVersion.status === 'testing') {
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
          status: 'testing',
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

    if (pipelineVersion.status !== 'testing') {
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

    if (pipelineVersion.status === 'testing') {
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
}
