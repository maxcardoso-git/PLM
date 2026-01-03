import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma';
import {
  CreateConversationDto,
  UpdateConversationDto,
  AddMessagesDto,
  ConversationResponseDto,
  ConversationWithMessagesDto,
  MessageResponseDto,
} from './dto';

@Injectable()
export class ConversationsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a new conversation for a card
   */
  async create(
    tenantId: string,
    orgId: string,
    dto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    // Find the card
    const card = await this.findCard(tenantId, orgId, dto.cardIdentifier, dto.identifierType);

    // Check if conversation with this externalId already exists
    const existing = await this.prisma.cardConversation.findUnique({
      where: {
        uq_conversation_external: {
          tenantId,
          externalId: dto.externalId,
        },
      },
    });

    if (existing) {
      throw new ConflictException(`Conversation with externalId '${dto.externalId}' already exists`);
    }

    const conversation = await this.prisma.cardConversation.create({
      data: {
        tenantId,
        orgId,
        cardId: card.id,
        stageId: card.currentStageId,
        externalId: dto.externalId,
        channel: dto.channel,
        participants: dto.participants as any,
        startedAt: new Date(dto.startedAt),
        metadata: dto.metadata as any,
      },
      include: {
        stage: { select: { id: true, name: true } },
        _count: { select: { messages: true } },
      },
    });

    return this.mapToResponse(conversation);
  }

  /**
   * Update a conversation by externalId
   */
  async updateByExternalId(
    tenantId: string,
    externalId: string,
    dto: UpdateConversationDto,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.prisma.cardConversation.findUnique({
      where: {
        uq_conversation_external: { tenantId, externalId },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation with externalId '${externalId}' not found`);
    }

    const updated = await this.prisma.cardConversation.update({
      where: { id: conversation.id },
      data: {
        status: dto.status,
        endedAt: dto.endedAt ? new Date(dto.endedAt) : undefined,
        summary: dto.summary,
        metadata: dto.metadata ? { ...(conversation.metadata as object || {}), ...dto.metadata } : undefined,
      },
      include: {
        stage: { select: { id: true, name: true } },
        _count: { select: { messages: true } },
      },
    });

    return this.mapToResponse(updated);
  }

  /**
   * Add messages to a conversation
   */
  async addMessages(
    tenantId: string,
    externalId: string,
    dto: AddMessagesDto,
  ): Promise<{ added: number }> {
    const conversation = await this.prisma.cardConversation.findUnique({
      where: {
        uq_conversation_external: { tenantId, externalId },
      },
    });

    if (!conversation) {
      throw new NotFoundException(`Conversation with externalId '${externalId}' not found`);
    }

    const messages = dto.messages.map((msg) => ({
      conversationId: conversation.id,
      senderType: msg.senderType,
      senderName: msg.senderName,
      senderId: msg.senderId,
      content: msg.content,
      contentType: msg.contentType || 'text',
      mediaUrl: msg.mediaUrl,
      sentAt: new Date(msg.sentAt),
    }));

    const result = await this.prisma.conversationMessage.createMany({
      data: messages,
      skipDuplicates: true,
    });

    return { added: result.count };
  }

  /**
   * Get all conversations for a card
   */
  async getCardConversations(
    tenantId: string,
    orgId: string,
    cardId: string,
  ): Promise<ConversationResponseDto[]> {
    // Verify card exists
    const card = await this.prisma.card.findFirst({
      where: { id: cardId, tenantId, orgId },
    });

    if (!card) {
      throw new NotFoundException('Card not found');
    }

    const conversations = await this.prisma.cardConversation.findMany({
      where: { cardId },
      include: {
        stage: { select: { id: true, name: true } },
        _count: { select: { messages: true } },
      },
      orderBy: { startedAt: 'desc' },
    });

    return conversations.map((c) => this.mapToResponse(c));
  }

  /**
   * Get conversation with messages
   */
  async getConversationWithMessages(
    tenantId: string,
    conversationId: string,
    limit = 100,
    offset = 0,
  ): Promise<ConversationWithMessagesDto> {
    const conversation = await this.prisma.cardConversation.findFirst({
      where: { id: conversationId, tenantId },
      include: {
        stage: { select: { id: true, name: true } },
        messages: {
          orderBy: { sentAt: 'asc' },
          take: limit,
          skip: offset,
        },
        _count: { select: { messages: true } },
      },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    return {
      ...this.mapToResponse(conversation),
      messages: conversation.messages.map((m) => this.mapMessageToResponse(m)),
    };
  }

  /**
   * Get messages for a conversation (paginated)
   */
  async getMessages(
    tenantId: string,
    conversationId: string,
    limit = 50,
    offset = 0,
  ): Promise<{ messages: MessageResponseDto[]; total: number }> {
    const conversation = await this.prisma.cardConversation.findFirst({
      where: { id: conversationId, tenantId },
    });

    if (!conversation) {
      throw new NotFoundException('Conversation not found');
    }

    const [messages, total] = await Promise.all([
      this.prisma.conversationMessage.findMany({
        where: { conversationId },
        orderBy: { sentAt: 'asc' },
        take: limit,
        skip: offset,
      }),
      this.prisma.conversationMessage.count({
        where: { conversationId },
      }),
    ]);

    return {
      messages: messages.map((m) => this.mapMessageToResponse(m)),
      total,
    };
  }

  /**
   * Helper: Find card by ID or sessionId
   */
  private async findCard(
    tenantId: string,
    orgId: string,
    identifier: string,
    type: 'cardId' | 'sessionId',
  ) {
    const where = type === 'cardId'
      ? { id: identifier, tenantId, orgId }
      : { sessionId: identifier, tenantId, orgId };

    const card = await this.prisma.card.findFirst({
      where,
      select: { id: true, currentStageId: true },
    });

    if (!card) {
      throw new NotFoundException(
        `Card not found with ${type}: ${identifier}`,
      );
    }

    return card;
  }

  /**
   * Helper: Map conversation to response DTO
   */
  private mapToResponse(conversation: any): ConversationResponseDto {
    return {
      id: conversation.id,
      cardId: conversation.cardId,
      stageId: conversation.stageId,
      stageName: conversation.stage?.name,
      externalId: conversation.externalId,
      channel: conversation.channel,
      status: conversation.status,
      participants: conversation.participants as any[],
      summary: conversation.summary,
      metadata: conversation.metadata as Record<string, any>,
      startedAt: conversation.startedAt,
      endedAt: conversation.endedAt,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      messageCount: conversation._count?.messages,
    };
  }

  /**
   * Helper: Map message to response DTO
   */
  private mapMessageToResponse(message: any): MessageResponseDto {
    return {
      id: message.id,
      senderType: message.senderType,
      senderName: message.senderName,
      senderId: message.senderId,
      content: message.content,
      contentType: message.contentType,
      mediaUrl: message.mediaUrl,
      sentAt: message.sentAt,
      createdAt: message.createdAt,
    };
  }
}
