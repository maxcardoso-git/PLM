import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  ExternalCreateCardDto,
  ExternalUpdateCardDto,
  ExternalUpdateFormDto,
  ExternalMoveCardDto,
  CardIdentifierType,
} from './dto';

interface ExternalApiContext {
  tenantId: string;
  orgId: string;
}

@Injectable()
export class ExternalApiService {
  constructor(private readonly prisma: PrismaService) {}

  async createCard(ctx: ExternalApiContext, dto: ExternalCreateCardDto) {
    // Find pipeline by key
    const pipeline = await this.prisma.pipeline.findFirst({
      where: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId,
        key: dto.pipelineKey,
        lifecycleStatus: { in: ['published', 'test'] },
      },
      include: {
        versions: {
          where: { status: { in: ['published', 'test'] } },
          include: {
            stages: {
              include: {
                formAttachRules: {
                  include: { formDefinition: true },
                },
              },
            },
          },
        },
      },
    });

    if (!pipeline || !pipeline.versions.length) {
      throw new NotFoundException(`Pipeline with key '${dto.pipelineKey}' not found or not published`);
    }

    const publishedVersion = pipeline.versions[0];

    // Check if sessionId already exists for this pipeline
    const existingCard = await this.prisma.card.findFirst({
      where: {
        pipelineId: pipeline.id,
        sessionId: dto.sessionId,
      },
    });

    if (existingCard) {
      throw new ConflictException({
        code: 'SESSION_ID_EXISTS',
        message: `A card with sessionId '${dto.sessionId}' already exists in pipeline '${dto.pipelineKey}'`,
        existingCardId: existingCard.id,
      });
    }

    // Find stage by key or use initial
    let targetStage;
    if (dto.stageKey) {
      targetStage = publishedVersion.stages.find((s) => s.key === dto.stageKey);
      if (!targetStage) {
        throw new BadRequestException(`Stage with key '${dto.stageKey}' not found`);
      }
    } else {
      targetStage = publishedVersion.stages.find((s) => s.isInitial);
      if (!targetStage) {
        throw new BadRequestException('No initial stage configured for this pipeline');
      }
    }

    // Check WIP limit
    if (targetStage.wipLimit) {
      const currentCount = await this.prisma.card.count({
        where: {
          currentStageId: targetStage.id,
          status: 'active',
        },
      });

      if (currentCount >= targetStage.wipLimit) {
        throw new ConflictException({
          code: 'WIP_LIMIT_REACHED',
          message: `WIP limit (${targetStage.wipLimit}) reached for stage "${targetStage.name}"`,
        });
      }
    }

    // Create card with forms
    const cardId = await this.prisma.$transaction(async (tx) => {
      const card = await tx.card.create({
        data: {
          tenantId: ctx.tenantId,
          orgId: ctx.orgId,
          pipelineId: pipeline.id,
          pipelineVersion: publishedVersion.version,
          currentStageId: targetStage.id,
          sessionId: dto.sessionId,
          title: dto.title,
          description: dto.description,
          priority: dto.priority || 'medium',
          status: 'active',
        },
      });

      // Attach forms from stage rules
      const formsToAttach: any[] = [];

      for (const rule of targetStage.formAttachRules) {
        if (rule.formDefinitionId && rule.formDefinition) {
          const formKey = rule.formDefinition.key || rule.formDefinition.name;
          const initialData = dto.formData?.[formKey] || dto.formData?.[rule.formDefinition.name] || {};

          formsToAttach.push({
            cardId: card.id,
            formDefinitionId: rule.formDefinitionId,
            formVersion: rule.formDefinition.version,
            status: Object.keys(initialData).length > 0 ? 'FILLED' : rule.defaultFormStatus,
            data: initialData,
            attachedAtStageId: targetStage.id,
          });
        }
      }

      if (formsToAttach.length > 0) {
        await tx.cardForm.createMany({ data: formsToAttach });
      }

      // Create outbox event
      await tx.outboxEvent.create({
        data: {
          tenantId: ctx.tenantId,
          orgId: ctx.orgId,
          eventType: 'PLM.CARD.CREATED',
          entityType: 'Card',
          entityId: card.id,
          payload: {
            card,
            pipelineId: pipeline.id,
            pipelineKey: pipeline.key,
            pipelineVersion: publishedVersion.version,
            stageId: targetStage.id,
            stageKey: targetStage.key,
            sessionId: dto.sessionId,
            source: 'external_api',
          },
          status: 'pending',
        },
      });

      return card.id;
    });

    return this.findCard(ctx, cardId, CardIdentifierType.CARD_ID);
  }

  async findCard(ctx: ExternalApiContext, identifier: string, type: CardIdentifierType) {
    const where: any = {
      tenantId: ctx.tenantId,
      orgId: ctx.orgId,
    };

    if (type === CardIdentifierType.SESSION_ID) {
      where.sessionId = identifier;
    } else {
      where.id = identifier;
    }

    const card = await this.prisma.card.findFirst({
      where,
      include: {
        pipeline: {
          select: { id: true, key: true, name: true },
        },
        currentStage: {
          include: {
            transitionsFrom: {
              include: {
                toStage: {
                  select: { id: true, key: true, name: true },
                },
              },
            },
          },
        },
        forms: {
          include: {
            formDefinition: {
              select: { id: true, name: true, version: true },
            },
          },
          orderBy: { attachedAt: 'asc' },
        },
      },
    });

    if (!card) {
      throw new NotFoundException(
        type === CardIdentifierType.SESSION_ID
          ? `Card with sessionId '${identifier}' not found`
          : `Card '${identifier}' not found`,
      );
    }

    return {
      id: card.id,
      sessionId: card.sessionId,
      pipelineId: card.pipelineId,
      pipelineKey: card.pipeline.key,
      pipelineName: card.pipeline.name,
      currentStageId: card.currentStageId,
      currentStageKey: card.currentStage.key,
      currentStageName: card.currentStage.name,
      title: card.title,
      description: card.description,
      priority: card.priority,
      status: card.status,
      uniqueKeyValue: card.uniqueKeyValue,
      createdAt: card.createdAt,
      updatedAt: card.updatedAt,
      closedAt: card.closedAt,
      forms: card.forms.map((f) => ({
        id: f.id,
        formDefinitionId: f.formDefinitionId,
        formName: f.formDefinition?.name,
        status: f.status,
        data: f.data,
      })),
      allowedTransitions: card.currentStage.transitionsFrom.map((t) => ({
        stageId: t.toStage.id,
        stageKey: t.toStage.key,
        stageName: t.toStage.name,
      })),
    };
  }

  async updateCard(
    ctx: ExternalApiContext,
    identifier: string,
    type: CardIdentifierType,
    dto: ExternalUpdateCardDto,
  ) {
    const card = await this.findCard(ctx, identifier, type);

    const updateData: any = {};
    if (dto.title !== undefined) updateData.title = dto.title;
    if (dto.description !== undefined) updateData.description = dto.description;
    if (dto.priority !== undefined) updateData.priority = dto.priority;

    await this.prisma.card.update({
      where: { id: card.id },
      data: updateData,
    });

    return this.findCard(ctx, card.id, CardIdentifierType.CARD_ID);
  }

  async updateCardForm(
    ctx: ExternalApiContext,
    identifier: string,
    type: CardIdentifierType,
    formIdentifier: string, // Can be formDefinitionId, formKey, or formName
    dto: ExternalUpdateFormDto,
  ) {
    const card = await this.findCard(ctx, identifier, type);

    // Find form by id or name
    const cardForm = card.forms.find(
      (f) =>
        f.formDefinitionId === formIdentifier ||
        f.formName === formIdentifier,
    );

    if (!cardForm) {
      throw new NotFoundException(
        `Form '${formIdentifier}' not found on card`,
      );
    }

    // Get the actual form record
    const dbCardForm = await this.prisma.cardForm.findFirst({
      where: {
        cardId: card.id,
        formDefinitionId: cardForm.formDefinitionId,
      },
    });

    if (!dbCardForm) {
      throw new NotFoundException('Card form not found');
    }

    if (dbCardForm.status === 'LOCKED') {
      throw new BadRequestException('Cannot update locked form');
    }

    // Merge data
    const mergedData = { ...(dbCardForm.data as object), ...dto.data };

    await this.prisma.cardForm.update({
      where: { id: dbCardForm.id },
      data: {
        data: mergedData,
        status: dto.status || 'FILLED',
      },
    });

    return this.findCard(ctx, card.id, CardIdentifierType.CARD_ID);
  }

  async moveCard(
    ctx: ExternalApiContext,
    identifier: string,
    type: CardIdentifierType,
    dto: ExternalMoveCardDto,
  ) {
    const card = await this.findCard(ctx, identifier, type);

    // Find target stage by key
    const targetStage = await this.prisma.stage.findFirst({
      where: {
        pipelineVersion: {
          pipelineId: card.pipelineId,
        },
        key: dto.toStageKey,
      },
      include: {
        formAttachRules: {
          include: { formDefinition: true },
        },
      },
    });

    if (!targetStage) {
      throw new NotFoundException(`Stage with key '${dto.toStageKey}' not found`);
    }

    // Check if transition is allowed
    const isAllowed = card.allowedTransitions.some(
      (t) => t.stageId === targetStage.id || t.stageKey === dto.toStageKey,
    );

    if (!isAllowed) {
      throw new ConflictException({
        code: 'TRANSITION_NOT_ALLOWED',
        message: `Transition from '${card.currentStageKey}' to '${dto.toStageKey}' is not allowed`,
        allowedTransitions: card.allowedTransitions,
      });
    }

    // Check WIP limit
    if (targetStage.wipLimit) {
      const currentCount = await this.prisma.card.count({
        where: {
          currentStageId: targetStage.id,
          status: 'active',
        },
      });

      if (currentCount >= targetStage.wipLimit) {
        throw new ConflictException({
          code: 'WIP_LIMIT_REACHED',
          message: `WIP limit (${targetStage.wipLimit}) reached for stage "${targetStage.name}"`,
        });
      }
    }

    // Check transition rules
    const transition = await this.prisma.stageTransition.findFirst({
      where: {
        fromStageId: card.currentStageId,
        toStageId: targetStage.id,
      },
      include: {
        rules: {
          where: { enabled: true },
        },
      },
    });

    if (transition?.rules) {
      for (const rule of transition.rules) {
        switch (rule.ruleType) {
          case 'FORM_REQUIRED': {
            const pendingForms = card.forms.filter((f) => f.status === 'TO_FILL');
            if (pendingForms.length > 0) {
              throw new ConflictException({
                code: 'FORMS_NOT_FILLED',
                message: 'All forms must be filled before this transition',
                pendingForms: pendingForms.map((f) => ({
                  id: f.id,
                  name: f.formName,
                })),
              });
            }
            break;
          }

          case 'COMMENT_REQUIRED': {
            const hasComment = dto.comment && dto.comment.trim().length > 0;
            if (!hasComment) {
              const existingComments = await this.prisma.cardComment.count({
                where: { cardId: card.id },
              });
              if (existingComments === 0) {
                throw new ConflictException({
                  code: 'COMMENT_REQUIRED',
                  message: 'A comment is required for this transition. Provide it in the "comment" field.',
                });
              }
            }
            break;
          }
        }
      }
    }

    // Perform the move in a transaction
    await this.prisma.$transaction(async (tx) => {
      // Lock forms from current stage if needed
      const currentStage = await tx.stage.findUnique({
        where: { id: card.currentStageId },
        include: { formAttachRules: true },
      });

      if (currentStage) {
        for (const rule of currentStage.formAttachRules) {
          if (rule.lockOnLeaveStage && rule.formDefinitionId) {
            await tx.cardForm.updateMany({
              where: {
                cardId: card.id,
                formDefinitionId: rule.formDefinitionId,
                status: { not: 'LOCKED' },
              },
              data: { status: 'LOCKED' },
            });
          }
        }
      }

      // Update card stage
      await tx.card.update({
        where: { id: card.id },
        data: { currentStageId: targetStage.id },
      });

      // Create move history
      await tx.cardMoveHistory.create({
        data: {
          cardId: card.id,
          fromStageId: card.currentStageId,
          toStageId: targetStage.id,
          reason: 'external_api',
        },
      });

      // Add comment if provided
      if (dto.comment && dto.comment.trim().length > 0) {
        await tx.cardComment.create({
          data: {
            cardId: card.id,
            content: dto.comment,
            userName: 'External API',
            userId: 'external_api',
          },
        });
      }

      // Attach new forms from target stage
      const existingFormIds = card.forms.map((f) => f.formDefinitionId);
      for (const rule of targetStage.formAttachRules) {
        if (rule.formDefinitionId && rule.formDefinition && !existingFormIds.includes(rule.formDefinitionId)) {
          await tx.cardForm.create({
            data: {
              cardId: card.id,
              formDefinitionId: rule.formDefinitionId,
              formVersion: rule.formDefinition.version,
              status: rule.defaultFormStatus,
              data: {},
              attachedAtStageId: targetStage.id,
            },
          });
        }
      }

      // Close card if final stage
      if (targetStage.isFinal) {
        await tx.card.update({
          where: { id: card.id },
          data: {
            status: 'closed',
            closedAt: new Date(),
          },
        });
      }

      // Create outbox event
      await tx.outboxEvent.create({
        data: {
          tenantId: ctx.tenantId,
          orgId: ctx.orgId,
          eventType: 'PLM.CARD.MOVED',
          entityType: 'Card',
          entityId: card.id,
          payload: {
            cardId: card.id,
            sessionId: card.sessionId,
            pipelineKey: card.pipelineKey,
            fromStageId: card.currentStageId,
            fromStageKey: card.currentStageKey,
            toStageId: targetStage.id,
            toStageKey: targetStage.key,
            source: 'external_api',
          },
          status: 'pending',
        },
      });
    });

    return this.findCard(ctx, card.id, CardIdentifierType.CARD_ID);
  }
}
