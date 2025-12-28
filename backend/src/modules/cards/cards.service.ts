import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCardDto, MoveCardDto, UpdateCardFormDto } from './dto';
import { TenantContext } from '../../common/decorators';

export interface MoveBlockedError {
  code: 'TRANSITION_NOT_ALLOWED' | 'WIP_LIMIT_REACHED' | 'FORMS_INCOMPLETE' | 'PERMISSION_DENIED';
  message: string;
  details?: any;
}

@Injectable()
export class CardsService {
  constructor(private prisma: PrismaService) {}

  async create(ctx: TenantContext, dto: CreateCardDto) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: {
        id: dto.pipelineId,
        tenantId: ctx.tenantId,
        organizationId: ctx.organizationId!,
        lifecycleStatus: 'published',
      },
      include: {
        versions: {
          where: { status: 'published' },
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
      throw new NotFoundException('Published pipeline not found');
    }

    const publishedVersion = pipeline.versions[0];
    const initialStage = dto.initialStageId
      ? publishedVersion.stages.find((s) => s.id === dto.initialStageId)
      : publishedVersion.stages.find((s) => s.isInitial);

    if (!initialStage) {
      throw new BadRequestException('Initial stage not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const card = await tx.card.create({
        data: {
          tenantId: ctx.tenantId,
          organizationId: ctx.organizationId!,
          pipelineId: dto.pipelineId,
          pipelineVersion: publishedVersion.version,
          currentStageId: initialStage.id,
          title: dto.title,
          description: dto.description,
          priority: dto.priority || 'medium',
          status: 'active',
        },
      });

      const formsToAttach: any[] = [];

      for (const rule of initialStage.formAttachRules) {
        formsToAttach.push({
          cardId: card.id,
          formDefinitionId: rule.formDefinitionId,
          formVersion: rule.formDefinition.version,
          status: rule.defaultFormStatus,
          data: {},
          attachedAtStageId: initialStage.id,
        });
      }

      if (dto.forms) {
        for (const form of dto.forms) {
          const formDef = await tx.formDefinition.findFirst({
            where: {
              id: form.formDefinitionId,
              tenantId: ctx.tenantId,
              status: 'published',
            },
          });

          if (formDef) {
            const existingIndex = formsToAttach.findIndex(
              (f) => f.formDefinitionId === form.formDefinitionId,
            );

            if (existingIndex >= 0) {
              formsToAttach[existingIndex].data = form.data;
              formsToAttach[existingIndex].status = form.status;
            } else {
              formsToAttach.push({
                cardId: card.id,
                formDefinitionId: form.formDefinitionId,
                formVersion: formDef.version,
                status: form.status,
                data: form.data,
                attachedAtStageId: initialStage.id,
              });
            }
          }
        }
      }

      if (formsToAttach.length > 0) {
        await tx.cardForm.createMany({ data: formsToAttach });
      }

      await tx.outboxEvent.create({
        data: {
          tenantId: ctx.tenantId,
          organizationId: ctx.organizationId!,
          eventType: 'PLM.CARD.CREATED',
          entityType: 'Card',
          entityId: card.id,
          payload: {
            card,
            pipelineId: dto.pipelineId,
            pipelineVersion: publishedVersion.version,
            stageId: initialStage.id,
          },
          status: 'pending',
        },
      });

      return this.findOne(ctx, card.id);
    });
  }

  async findAll(
    ctx: TenantContext,
    filters: { pipelineId?: string; stageId?: string; status?: string },
  ) {
    return this.prisma.card.findMany({
      where: {
        tenantId: ctx.tenantId,
        organizationId: ctx.organizationId!,
        ...(filters.pipelineId && { pipelineId: filters.pipelineId }),
        ...(filters.stageId && { currentStageId: filters.stageId }),
        ...(filters.status && { status: filters.status as any }),
      },
      include: {
        currentStage: {
          select: {
            id: true,
            name: true,
            color: true,
            classification: true,
          },
        },
        forms: {
          select: {
            id: true,
            status: true,
            formDefinition: {
              select: { id: true, name: true },
            },
          },
        },
        _count: {
          select: { moveHistory: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(ctx: TenantContext, id: string) {
    const card = await this.prisma.card.findFirst({
      where: {
        id,
        tenantId: ctx.tenantId,
        organizationId: ctx.organizationId!,
      },
      include: {
        currentStage: {
          include: {
            transitionsFrom: {
              include: {
                toStage: {
                  select: { id: true, name: true, color: true, wipLimit: true },
                },
              },
            },
          },
        },
        forms: {
          include: {
            formDefinition: true,
            attachedAtStage: {
              select: { id: true, name: true },
            },
          },
          orderBy: { attachedAt: 'asc' },
        },
        moveHistory: {
          include: {
            fromStage: { select: { id: true, name: true, color: true } },
            toStage: { select: { id: true, name: true, color: true } },
          },
          orderBy: { movedAt: 'desc' },
        },
        pipeline: {
          select: { id: true, key: true, name: true },
        },
      },
    });

    if (!card) {
      throw new NotFoundException(`Card ${id} not found`);
    }

    return {
      card: {
        id: card.id,
        tenantId: card.tenantId,
        organizationId: card.organizationId,
        pipelineId: card.pipelineId,
        pipelineVersion: card.pipelineVersion,
        currentStageId: card.currentStageId,
        title: card.title,
        description: card.description,
        priority: card.priority,
        status: card.status,
        createdAt: card.createdAt,
        closedAt: card.closedAt,
        currentStage: card.currentStage,
        pipeline: card.pipeline,
      },
      forms: card.forms,
      history: card.moveHistory,
      allowedTransitions: card.currentStage.transitionsFrom.map((t) => t.toStage),
    };
  }

  async move(ctx: TenantContext, cardId: string, dto: MoveCardDto): Promise<any> {
    const cardData = await this.findOne(ctx, cardId);
    const card = cardData.card;

    const transitionAllowed = cardData.allowedTransitions.some(
      (t) => t.id === dto.toStageId,
    );

    if (!transitionAllowed) {
      throw new ConflictException({
        code: 'TRANSITION_NOT_ALLOWED',
        message: 'Transition to target stage is not allowed',
        details: {
          currentStageId: card.currentStageId,
          targetStageId: dto.toStageId,
          allowedTransitions: cardData.allowedTransitions.map((t) => t.id),
        },
      } as MoveBlockedError);
    }

    const targetStage = await this.prisma.stage.findUnique({
      where: { id: dto.toStageId },
      include: {
        formAttachRules: {
          include: { formDefinition: true },
        },
      },
    });

    if (!targetStage) {
      throw new NotFoundException('Target stage not found');
    }

    if (targetStage.wipLimit) {
      const currentCount = await this.prisma.card.count({
        where: {
          currentStageId: dto.toStageId,
          status: 'active',
        },
      });

      if (currentCount >= targetStage.wipLimit) {
        throw new ConflictException({
          code: 'WIP_LIMIT_REACHED',
          message: `WIP limit (${targetStage.wipLimit}) reached for stage "${targetStage.name}"`,
          details: {
            stageId: dto.toStageId,
            wipLimit: targetStage.wipLimit,
            currentCount,
          },
        } as MoveBlockedError);
      }
    }

    const incompleteFields = await this.validateRequiredFields(cardData.forms);
    if (incompleteFields.length > 0) {
      throw new ConflictException({
        code: 'FORMS_INCOMPLETE',
        message: 'Some required form fields are missing',
        details: { incompleteFields },
      } as MoveBlockedError);
    }

    return this.prisma.$transaction(async (tx) => {
      const currentStage = await tx.stage.findUnique({
        where: { id: card.currentStageId },
        include: { formAttachRules: true },
      });

      if (!currentStage) {
        throw new NotFoundException('Current stage not found');
      }

      for (const rule of currentStage.formAttachRules) {
        if (rule.lockOnLeaveStage) {
          await tx.cardForm.updateMany({
            where: {
              cardId,
              formDefinitionId: rule.formDefinitionId,
              status: { not: 'LOCKED' },
            },
            data: { status: 'LOCKED' },
          });
        }
      }

      await tx.card.update({
        where: { id: cardId },
        data: { currentStageId: dto.toStageId },
      });

      await tx.cardMoveHistory.create({
        data: {
          cardId,
          fromStageId: card.currentStageId,
          toStageId: dto.toStageId,
          reason: dto.reason || 'manual',
        },
      });

      const existingFormIds = cardData.forms.map((f) => f.formDefinitionId);
      for (const rule of targetStage.formAttachRules) {
        if (!existingFormIds.includes(rule.formDefinitionId)) {
          await tx.cardForm.create({
            data: {
              cardId,
              formDefinitionId: rule.formDefinitionId,
              formVersion: rule.formDefinition.version,
              status: rule.defaultFormStatus,
              data: {},
              attachedAtStageId: dto.toStageId,
            },
          });
        }
      }

      if (targetStage.isFinal) {
        await tx.card.update({
          where: { id: cardId },
          data: {
            status: 'closed',
            closedAt: new Date(),
          },
        });
      }

      const updatedCard = await this.findOne(ctx, cardId);

      await tx.outboxEvent.create({
        data: {
          tenantId: ctx.tenantId,
          organizationId: ctx.organizationId!,
          eventType: 'PLM.CARD.MOVED',
          entityType: 'Card',
          entityId: cardId,
          payload: {
            card: updatedCard.card,
            forms: updatedCard.forms.reduce((acc, f) => {
              acc[f.formDefinitionId] = {
                status: f.status,
                data: f.data,
                formVersion: f.formVersion,
                attachedAtStageId: f.attachedAtStageId,
              };
              return acc;
            }, {}),
            fromStageId: card.currentStageId,
            toStageId: dto.toStageId,
          },
          status: 'pending',
        },
      });

      return updatedCard;
    });
  }

  private async validateRequiredFields(forms: any[]): Promise<any[]> {
    const incomplete: any[] = [];

    for (const form of forms) {
      if (form.status !== 'TO_FILL') continue;

      const schema = form.formDefinition?.schemaJson;
      if (!schema?.fields) continue;

      const requiredFields = schema.fields.filter((f: any) => f.required);
      const data = form.data || {};

      for (const field of requiredFields) {
        const value = data[field.id];
        if (value === undefined || value === null || value === '') {
          incomplete.push({
            formId: form.id,
            formName: form.formDefinition.name,
            fieldId: field.id,
            fieldLabel: field.label || field.id,
          });
        }
      }
    }

    return incomplete;
  }

  async updateForm(
    ctx: TenantContext,
    cardId: string,
    formDefinitionId: string,
    dto: UpdateCardFormDto,
  ) {
    await this.findOne(ctx, cardId);

    const cardForm = await this.prisma.cardForm.findFirst({
      where: {
        cardId,
        formDefinitionId,
      },
    });

    if (!cardForm) {
      throw new NotFoundException('Card form not found');
    }

    if (cardForm.status === 'LOCKED' && dto.data) {
      throw new BadRequestException('Cannot update locked form data');
    }

    const updateData: any = {};
    if (dto.status) updateData.status = dto.status;
    if (dto.data) {
      updateData.data = { ...(cardForm.data as object), ...dto.data };
    }

    return this.prisma.cardForm.update({
      where: { id: cardForm.id },
      data: updateData,
      include: {
        formDefinition: {
          select: { id: true, name: true, version: true, schemaJson: true },
        },
      },
    });
  }

  async getKanbanBoard(ctx: TenantContext, pipelineId: string) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: {
        id: pipelineId,
        tenantId: ctx.tenantId,
        organizationId: ctx.organizationId!,
      },
    });

    if (!pipeline) {
      throw new NotFoundException('Pipeline not found');
    }

    if (!pipeline.publishedVersion) {
      throw new BadRequestException('Pipeline has no published version');
    }

    const pipelineVersion = await this.prisma.pipelineVersion.findFirst({
      where: {
        pipelineId,
        version: pipeline.publishedVersion,
      },
      include: {
        stages: {
          where: { active: true },
          orderBy: { stageOrder: 'asc' },
          include: {
            transitionsFrom: {
              include: {
                toStage: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    });

    if (!pipelineVersion) {
      throw new NotFoundException('Published version not found');
    }

    const cards = await this.prisma.card.findMany({
      where: {
        pipelineId,
        pipelineVersion: pipeline.publishedVersion,
        status: 'active',
      },
      include: {
        forms: {
          select: {
            id: true,
            status: true,
            formDefinition: { select: { name: true } },
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'asc' }],
    });

    const cardsByStage = new Map<string, any[]>();
    for (const stage of pipelineVersion.stages) {
      cardsByStage.set(stage.id, []);
    }
    for (const card of cards) {
      const stageCards = cardsByStage.get(card.currentStageId);
      if (stageCards) {
        stageCards.push({
          ...card,
          pendingFormsCount: card.forms.filter((f) => f.status === 'TO_FILL').length,
        });
      }
    }

    return {
      pipeline: {
        id: pipeline.id,
        key: pipeline.key,
        name: pipeline.name,
        publishedVersion: pipeline.publishedVersion,
      },
      stages: pipelineVersion.stages.map((stage) => ({
        id: stage.id,
        name: stage.name,
        color: stage.color,
        classification: stage.classification,
        stageOrder: stage.stageOrder,
        wipLimit: stage.wipLimit,
        isInitial: stage.isInitial,
        isFinal: stage.isFinal,
        allowedTransitions: stage.transitionsFrom.map((t) => ({
          toStageId: t.toStageId,
          toStageName: t.toStage.name,
        })),
        cards: cardsByStage.get(stage.id) || [],
        cardCount: (cardsByStage.get(stage.id) || []).length,
      })),
    };
  }
}
