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
  ExternalCreateConversationDto,
  ExternalAddMessagesDto,
  ExternalUpdateConversationDto,
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
          uniqueKeyValue: dto.uniqueKeyValue,
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
    if (dto.uniqueKeyValue !== undefined) updateData.uniqueKeyValue = dto.uniqueKeyValue;

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
            userId: null, // External API comments don't have a user ID
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

  // ======================================
  // Conversation Methods
  // ======================================

  async createConversation(ctx: ExternalApiContext, dto: ExternalCreateConversationDto) {
    const identifierType = dto.identifierType || CardIdentifierType.SESSION_ID;

    // Find the card
    const card = await this.findCard(ctx, dto.cardIdentifier, identifierType);

    // Check if conversation with this externalId already exists
    const existing = await this.prisma.cardConversation.findUnique({
      where: {
        uq_conversation_external: {
          tenantId: ctx.tenantId,
          externalId: dto.externalId,
        },
      },
    });

    if (existing) {
      // Return existing conversation (upsert behavior)
      return this.getConversation(ctx, dto.externalId);
    }

    // Create new conversation
    const conversation = await this.prisma.cardConversation.create({
      data: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId,
        cardId: card.id,
        stageId: card.currentStageId,
        externalId: dto.externalId,
        channel: dto.channel,
        status: 'ACTIVE',
        participants: dto.participants as any,
        metadata: dto.metadata,
        startedAt: new Date(dto.startedAt),
      },
      include: {
        stage: { select: { id: true, name: true, key: true } },
        _count: { select: { messages: true } },
      },
    });

    return this.formatConversation(conversation);
  }

  async getConversation(ctx: ExternalApiContext, externalId: string) {
    const conversation = await this.prisma.cardConversation.findFirst({
      where: {
        tenantId: ctx.tenantId,
        externalId: externalId,
      },
      include: {
        stage: { select: { id: true, name: true, key: true } },
        _count: { select: { messages: true } },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation with externalId '${externalId}' not found`);
    }

    return this.formatConversation(conversation);
  }

  async addMessages(ctx: ExternalApiContext, externalId: string, dto: ExternalAddMessagesDto) {
    // Find conversation
    const conversation = await this.prisma.cardConversation.findFirst({
      where: {
        tenantId: ctx.tenantId,
        externalId: externalId,
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation with externalId '${externalId}' not found`);
    }

    // Create messages
    const messagesToCreate = dto.messages.map((msg) => ({
      conversationId: conversation.id,
      senderType: msg.senderType,
      senderName: msg.senderName,
      senderId: msg.senderId,
      content: msg.content,
      contentType: msg.contentType || 'text',
      mediaUrl: msg.mediaUrl,
      sentAt: new Date(msg.sentAt),
    }));

    await this.prisma.conversationMessage.createMany({
      data: messagesToCreate,
    });

    // Return updated conversation
    return this.getConversation(ctx, externalId);
  }

  async updateConversation(
    ctx: ExternalApiContext,
    externalId: string,
    dto: ExternalUpdateConversationDto,
  ) {
    // Find conversation
    const conversation = await this.prisma.cardConversation.findFirst({
      where: {
        tenantId: ctx.tenantId,
        externalId: externalId,
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation with externalId '${externalId}' not found`);
    }

    // Build update data
    const updateData: any = {};
    if (dto.status) updateData.status = dto.status;
    if (dto.endedAt) updateData.endedAt = new Date(dto.endedAt);
    if (dto.summary !== undefined) updateData.summary = dto.summary;
    if (dto.metadata) {
      updateData.metadata = {
        ...(conversation.metadata as object || {}),
        ...dto.metadata,
      };
    }

    await this.prisma.cardConversation.update({
      where: { id: conversation.id },
      data: updateData,
    });

    return this.getConversation(ctx, externalId);
  }

  private formatConversation(conversation: any) {
    return {
      id: conversation.id,
      cardId: conversation.cardId,
      externalId: conversation.externalId,
      channel: conversation.channel,
      status: conversation.status,
      participants: conversation.participants,
      summary: conversation.summary,
      metadata: conversation.metadata,
      startedAt: conversation.startedAt,
      endedAt: conversation.endedAt,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      stage: conversation.stage
        ? {
            id: conversation.stage.id,
            name: conversation.stage.name,
            key: conversation.stage.key,
          }
        : null,
      messageCount: conversation._count?.messages || 0,
    };
  }

  // ======================================
  // Pipeline Methods
  // ======================================

  async listPipelines(ctx: ExternalApiContext) {
    const pipelines = await this.prisma.pipeline.findMany({
      where: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId,
        lifecycleStatus: { in: ['published', 'test'] },
      },
      include: {
        versions: {
          where: { status: { in: ['published', 'test'] } },
          include: {
            stages: {
              orderBy: { stageOrder: 'asc' },
              select: {
                id: true,
                name: true,
                key: true,
                stageOrder: true,
                classification: true,
                isInitial: true,
                isFinal: true,
                wipLimit: true,
                color: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    return {
      items: pipelines.map((pipeline) => this.formatPipeline(pipeline)),
      total: pipelines.length,
    };
  }

  async getPipeline(ctx: ExternalApiContext, identifier: string) {
    // Check if identifier is a valid UUID
    const isUuid =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        identifier,
      );

    // Try to find by ID first (if valid UUID), then by key
    let pipeline: Awaited<ReturnType<typeof this.prisma.pipeline.findFirst>> =
      null;

    if (isUuid) {
      pipeline = await this.prisma.pipeline.findFirst({
        where: {
          id: identifier,
          tenantId: ctx.tenantId,
          orgId: ctx.orgId,
          lifecycleStatus: { in: ['published', 'test'] },
        },
      include: {
        versions: {
          where: { status: { in: ['published', 'test'] } },
          include: {
            stages: {
              orderBy: { stageOrder: 'asc' },
              include: {
                formAttachRules: {
                  include: {
                    formDefinition: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      });
    }

    // If not found by ID (or identifier is not a UUID), try by key
    if (!pipeline) {
      pipeline = await this.prisma.pipeline.findFirst({
        where: {
          key: identifier,
          tenantId: ctx.tenantId,
          orgId: ctx.orgId,
          lifecycleStatus: { in: ['published', 'test'] },
        },
        include: {
          versions: {
            where: { status: { in: ['published', 'test'] } },
            include: {
              stages: {
                orderBy: { stageOrder: 'asc' },
                include: {
                  formAttachRules: {
                    include: {
                      formDefinition: {
                        select: {
                          id: true,
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
        },
      });
    }

    if (!pipeline) {
      throw new NotFoundException(`Pipeline '${identifier}' not found`);
    }

    return this.formatPipelineDetailed(pipeline);
  }

  private formatPipeline(pipeline: any) {
    const version = pipeline.versions?.[0];
    return {
      id: pipeline.id,
      name: pipeline.name,
      key: pipeline.key,
      description: pipeline.description,
      lifecycleStatus: pipeline.lifecycleStatus,
      // Orchestrator domain integration
      domain: pipeline.domain,
      domainDescription: pipeline.domainDescription,
      stages: version?.stages?.map((stage: any) => ({
        id: stage.id,
        name: stage.name,
        key: stage.key,
        order: stage.stageOrder,
        type: stage.classification,
        isInitial: stage.isInitial,
        isFinal: stage.isFinal,
        wipLimit: stage.wipLimit,
        color: stage.color,
        // ISC state mapping
        iscStates: stage.iscStates || [],
        stageStrategy: stage.stageStrategy,
      })) || [],
    };
  }

  private formatPipelineDetailed(pipeline: any) {
    const version = pipeline.versions?.[0];
    return {
      id: pipeline.id,
      name: pipeline.name,
      key: pipeline.key,
      description: pipeline.description,
      lifecycleStatus: pipeline.lifecycleStatus,
      // Orchestrator domain integration
      domain: pipeline.domain,
      domainDescription: pipeline.domainDescription,
      stages: version?.stages?.map((stage: any) => ({
        id: stage.id,
        name: stage.name,
        key: stage.key,
        order: stage.stageOrder,
        type: stage.classification,
        isInitial: stage.isInitial,
        isFinal: stage.isFinal,
        wipLimit: stage.wipLimit,
        color: stage.color,
        // ISC state mapping
        iscStates: stage.iscStates || [],
        stageStrategy: stage.stageStrategy,
        attachedForms: stage.formAttachRules?.map((rule: any) => ({
          formId: rule.formDefinition?.id,
          formName: rule.formDefinition?.name,
          autoAttach: rule.autoAttach,
          required: rule.required,
          defaultStatus: rule.defaultFormStatus,
        })) || [],
      })) || [],
    };
  }

  /**
   * Get complete pipeline workflow design for AI assistants
   * Includes stages, transitions, rules, and form requirements
   */
  async getPipelineWorkflow(ctx: ExternalApiContext, identifier: string) {
    // Check if identifier is a valid UUID
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);

    // Try to find by ID first (if UUID), then by key
    let pipeline: Awaited<ReturnType<typeof this.prisma.pipeline.findFirst>> = null;
    if (isUuid) {
      pipeline = await this.prisma.pipeline.findFirst({
        where: {
          id: identifier,
          tenantId: ctx.tenantId,
          orgId: ctx.orgId,
          lifecycleStatus: { in: ['published', 'test'] },
        },
      });
    }

    // If not found by ID, try by key
    if (!pipeline) {
      pipeline = await this.prisma.pipeline.findFirst({
        where: {
          key: identifier,
          tenantId: ctx.tenantId,
          orgId: ctx.orgId,
          lifecycleStatus: { in: ['published', 'test'] },
        },
      });
    }

    if (!pipeline) {
      throw new NotFoundException(`Pipeline '${identifier}' not found`);
    }

    // Get the published version with all details
    const pipelineVersion = await this.prisma.pipelineVersion.findFirst({
      where: {
        pipelineId: pipeline.id,
        status: { in: ['published', 'test'] },
      },
      include: {
        stages: {
          where: { active: true },
          orderBy: { stageOrder: 'asc' },
          include: {
            transitionsFrom: {
              include: {
                toStage: {
                  select: { id: true, name: true, key: true },
                },
                rules: true,
              },
            },
            formAttachRules: {
              include: {
                formDefinition: {
                  select: { id: true, name: true },
                },
              },
            },
            triggers: {
              where: { enabled: true },
              include: {
                integration: {
                  select: { id: true, name: true, key: true },
                },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!pipelineVersion) {
      throw new NotFoundException(`Published version not found for pipeline '${identifier}'`);
    }

    // Build ISC state to stage mapping for Orchestrator
    const iscStateMapping: Record<string, string> = {};
    for (const stage of pipelineVersion.stages) {
      const iscStates = (stage as any).iscStates || [];
      for (const iscState of iscStates) {
        iscStateMapping[iscState] = stage.key || stage.name;
      }
    }

    // Format the workflow for AI consumption
    return {
      pipeline: {
        id: pipeline.id,
        name: pipeline.name,
        key: pipeline.key,
        description: pipeline.description,
        status: pipeline.lifecycleStatus,
        version: pipelineVersion.version,
        // Orchestrator domain integration
        domain: pipeline.domain,
        domainDescription: pipeline.domainDescription,
      },
      // ISC state to stage mapping (for Orchestrator automatic stage resolution)
      iscStateMapping,
      stages: pipelineVersion.stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        key: stage.key,
        order: stage.stageOrder,
        classification: stage.classification,
        description: this.getStageClassificationDescription(stage.classification),
        isInitial: stage.isInitial,
        isFinal: stage.isFinal,
        wipLimit: stage.wipLimit,
        color: stage.color,
        // ISC states mapped to this stage (for Orchestrator integration)
        iscStates: (stage as any).iscStates || [],
        stageStrategy: (stage as any).stageStrategy,
        // Forms that get attached at this stage
        forms: stage.formAttachRules.map((rule) => ({
          id: rule.formDefinition?.id || rule.externalFormId,
          name: rule.formDefinition?.name || rule.externalFormName,
          isExternal: !rule.formDefinitionId,
          defaultStatus: rule.defaultFormStatus,
          lockOnLeaveStage: rule.lockOnLeaveStage,
        })),
        // Integrations/triggers configured for this stage
        integrations: stage.triggers.map((trigger) => ({
          id: trigger.id,
          name: trigger.integration.name,
          key: trigger.integration.key,
          event: trigger.eventType,
        })),
        // Allowed transitions FROM this stage
        allowedTransitions: stage.transitionsFrom.map((transition) => ({
          toStageId: transition.toStageId,
          toStageName: transition.toStage.name,
          toStageKey: transition.toStage.key,
          rules: {
            requiresComment: transition.rules.some((r) => r.ruleType === 'COMMENT_REQUIRED'),
            requiresFormFilled: transition.rules.some((r) => r.ruleType === 'FORM_REQUIRED'),
            ownerOnly: transition.rules.some((r) => r.ruleType === 'OWNER_ONLY'),
          },
        })),
      })),
      // Summary for quick reference
      summary: {
        totalStages: pipelineVersion.stages.length,
        initialStage: pipelineVersion.stages.find((s) => s.isInitial)?.name,
        finalStages: pipelineVersion.stages.filter((s) => s.isFinal).map((s) => s.name),
        stageFlow: pipelineVersion.stages.map((s) => s.name).join(' → '),
        // Quick ISC mapping reference
        iscStatesConfigured: Object.keys(iscStateMapping).length > 0,
      },
    };
  }

  private getStageClassificationDescription(classification: string): string {
    const descriptions: Record<string, string> = {
      backlog: 'Estágio de espera/fila antes do processamento',
      doing: 'Estágio de trabalho ativo em andamento',
      waiting: 'Estágio de espera por ação externa ou aprovação',
      done: 'Estágio de conclusão/finalização',
    };
    return descriptions[classification] || classification;
  }
}
