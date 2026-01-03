import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsObject,
  IsArray,
  IsDateString,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum CardPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum CardIdentifierType {
  CARD_ID = 'cardId',
  SESSION_ID = 'sessionId',
}

export class ExternalCreateCardDto {
  @ApiProperty({ example: 'VENDAS', description: 'Key do pipeline' })
  @IsString()
  @IsNotEmpty()
  pipelineKey: string;

  @ApiPropertyOptional({ example: 'NOVO_LEAD', description: 'Key do estágio (usa initial se não informado)' })
  @IsOptional()
  @IsString()
  stageKey?: string;

  @ApiProperty({ example: 'session_abc123', description: 'ID da sessão de chat' })
  @IsString()
  @IsNotEmpty()
  sessionId: string;

  @ApiProperty({ example: 'Novo Lead - João Silva' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional({ example: 'Lead proveniente do chat' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: CardPriority, default: CardPriority.MEDIUM })
  @IsOptional()
  @IsEnum(CardPriority)
  priority?: CardPriority;

  @ApiPropertyOptional({
    description: 'Dados iniciais dos formulários por nome/key',
    example: { 'dados-cliente': { nome: 'João', telefone: '11999999999' } },
  })
  @IsOptional()
  @IsObject()
  formData?: Record<string, Record<string, any>>;
}

export class ExternalUpdateCardDto {
  @ApiPropertyOptional({ example: 'Título atualizado' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 'Descrição atualizada' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: CardPriority })
  @IsOptional()
  @IsEnum(CardPriority)
  priority?: CardPriority;
}

export class ExternalUpdateFormDto {
  @ApiProperty({
    description: 'Dados do formulário',
    example: { nome: 'João Silva', email: 'joao@email.com' },
  })
  @IsObject()
  @IsNotEmpty()
  data: Record<string, any>;

  @ApiPropertyOptional({ enum: ['TO_FILL', 'FILLED'], default: 'FILLED' })
  @IsOptional()
  @IsEnum(['TO_FILL', 'FILLED'])
  status?: 'TO_FILL' | 'FILLED';
}

export class ExternalMoveCardDto {
  @ApiProperty({ example: 'QUALIFICADO', description: 'Key do estágio destino' })
  @IsString()
  @IsNotEmpty()
  toStageKey: string;

  @ApiPropertyOptional({ example: 'Cliente qualificado pelo atendente', description: 'Comentário (obrigatório se regra exigir)' })
  @IsOptional()
  @IsString()
  comment?: string;
}

// Response DTOs
export class ExternalCardResponseDto {
  id: string;
  sessionId: string;
  pipelineId: string;
  pipelineKey: string;
  pipelineName: string;
  currentStageId: string;
  currentStageName: string;
  currentStageKey: string;
  title: string;
  description?: string;
  priority: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  closedAt?: Date;
}

export class ExternalFormResponseDto {
  id: string;
  formName: string;
  formKey?: string;
  status: string;
  data: Record<string, any>;
}

export class ExternalCardDetailResponseDto extends ExternalCardResponseDto {
  forms: ExternalFormResponseDto[];
  allowedTransitions: {
    stageId: string;
    stageKey: string;
    stageName: string;
  }[];
}

export class MoveValidationErrorDto {
  code: string;
  message: string;
  details?: any;
}

// ======================================
// Conversation DTOs
// ======================================

export enum ConversationChannel {
  WHATSAPP = 'WHATSAPP',
  WEBCHAT = 'WEBCHAT',
  PHONE = 'PHONE',
  EMAIL = 'EMAIL',
  OTHER = 'OTHER',
}

export enum ConversationStatus {
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED',
  ABANDONED = 'ABANDONED',
  TRANSFERRED = 'TRANSFERRED',
}

export enum ParticipantType {
  CLIENT = 'CLIENT',
  AGENT = 'AGENT',
  OPERATOR = 'OPERATOR',
}

export class ParticipantDto {
  @ApiProperty({ enum: ParticipantType, example: 'CLIENT' })
  @IsEnum(ParticipantType)
  type: ParticipantType;

  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: '+5511999999999' })
  @IsOptional()
  @IsString()
  externalId?: string;
}

export class ExternalCreateConversationDto {
  @ApiProperty({ example: 'session_abc123', description: 'Session ID ou Card ID do card' })
  @IsString()
  @IsNotEmpty()
  cardIdentifier: string;

  @ApiPropertyOptional({ enum: CardIdentifierType, default: CardIdentifierType.SESSION_ID })
  @IsOptional()
  @IsEnum(CardIdentifierType)
  identifierType?: CardIdentifierType;

  @ApiProperty({ example: 'conv_12345', description: 'ID único da conversa no sistema externo' })
  @IsString()
  @IsNotEmpty()
  externalId: string;

  @ApiProperty({ enum: ConversationChannel, example: 'WHATSAPP' })
  @IsEnum(ConversationChannel)
  channel: ConversationChannel;

  @ApiProperty({
    type: [ParticipantDto],
    example: [
      { type: 'CLIENT', name: 'João Silva', externalId: '+5511999999999' },
      { type: 'AGENT', name: 'Bot Atendimento', externalId: 'bot_1' },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantDto)
  participants: ParticipantDto[];

  @ApiProperty({ example: '2026-01-03T10:00:00Z' })
  @IsDateString()
  startedAt: string;

  @ApiPropertyOptional({ example: { queue: 'vendas', campaign: 'janeiro' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

export class ConversationMessageDto {
  @ApiProperty({ enum: ParticipantType, example: 'CLIENT' })
  @IsEnum(ParticipantType)
  senderType: ParticipantType;

  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @IsNotEmpty()
  senderName: string;

  @ApiPropertyOptional({ example: '+5511999999999' })
  @IsOptional()
  @IsString()
  senderId?: string;

  @ApiProperty({ example: 'Olá, gostaria de informações' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ example: 'text', default: 'text' })
  @IsOptional()
  @IsString()
  contentType?: string;

  @ApiPropertyOptional({ example: 'https://example.com/image.jpg' })
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiProperty({ example: '2026-01-03T10:00:05Z' })
  @IsDateString()
  sentAt: string;
}

export class ExternalAddMessagesDto {
  @ApiProperty({ type: [ConversationMessageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConversationMessageDto)
  messages: ConversationMessageDto[];
}

export class ExternalUpdateConversationDto {
  @ApiPropertyOptional({ enum: ConversationStatus, example: 'CLOSED' })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @ApiPropertyOptional({ example: '2026-01-03T10:30:00Z' })
  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @ApiPropertyOptional({ example: 'Cliente solicitou informações sobre produto X' })
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional({ example: { resolution: 'sold' } })
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}
