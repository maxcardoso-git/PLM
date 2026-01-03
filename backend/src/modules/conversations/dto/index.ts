import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
  IsDateString,
  IsObject,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ConversationChannel, ConversationStatus, ParticipantType } from '@prisma/client';

// ==================== Participant DTO ====================

export class ParticipantDto {
  @ApiProperty({ enum: ParticipantType })
  @IsEnum(ParticipantType)
  type: ParticipantType;

  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  externalId?: string;
}

// ==================== Create Conversation DTO ====================

export class CreateConversationDto {
  @ApiProperty({ description: 'Card ID or Session ID' })
  @IsString()
  cardIdentifier: string;

  @ApiProperty({ enum: ['cardId', 'sessionId'], default: 'sessionId' })
  @IsEnum(['cardId', 'sessionId'])
  identifierType: 'cardId' | 'sessionId';

  @ApiProperty({ description: 'Unique ID from external system' })
  @IsString()
  externalId: string;

  @ApiProperty({ enum: ConversationChannel })
  @IsEnum(ConversationChannel)
  channel: ConversationChannel;

  @ApiProperty({ type: [ParticipantDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ParticipantDto)
  participants: ParticipantDto[];

  @ApiProperty()
  @IsDateString()
  startedAt: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// ==================== Update Conversation DTO ====================

export class UpdateConversationDto {
  @ApiPropertyOptional({ enum: ConversationStatus })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endedAt?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

// ==================== Message DTO ====================

export class MessageDto {
  @ApiProperty({ enum: ParticipantType })
  @IsEnum(ParticipantType)
  senderType: ParticipantType;

  @ApiProperty()
  @IsString()
  senderName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  senderId?: string;

  @ApiProperty()
  @IsString()
  content: string;

  @ApiPropertyOptional({ default: 'text' })
  @IsOptional()
  @IsString()
  contentType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mediaUrl?: string;

  @ApiProperty()
  @IsDateString()
  sentAt: string;
}

export class AddMessagesDto {
  @ApiProperty({ type: [MessageDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MessageDto)
  messages: MessageDto[];
}

// ==================== Response DTOs ====================

export class ConversationResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  cardId: string;

  @ApiPropertyOptional()
  stageId?: string;

  @ApiPropertyOptional()
  stageName?: string;

  @ApiProperty()
  externalId: string;

  @ApiProperty({ enum: ConversationChannel })
  channel: ConversationChannel;

  @ApiProperty({ enum: ConversationStatus })
  status: ConversationStatus;

  @ApiProperty({ type: [ParticipantDto] })
  participants: ParticipantDto[];

  @ApiPropertyOptional()
  summary?: string;

  @ApiPropertyOptional()
  metadata?: Record<string, any>;

  @ApiProperty()
  startedAt: Date;

  @ApiPropertyOptional()
  endedAt?: Date;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  @ApiPropertyOptional()
  messageCount?: number;
}

export class MessageResponseDto {
  @ApiProperty()
  id: string;

  @ApiProperty({ enum: ParticipantType })
  senderType: ParticipantType;

  @ApiProperty()
  senderName: string;

  @ApiPropertyOptional()
  senderId?: string;

  @ApiProperty()
  content: string;

  @ApiProperty()
  contentType: string;

  @ApiPropertyOptional()
  mediaUrl?: string;

  @ApiProperty()
  sentAt: Date;

  @ApiProperty()
  createdAt: Date;
}

export class ConversationWithMessagesDto extends ConversationResponseDto {
  @ApiProperty({ type: [MessageResponseDto] })
  messages: MessageResponseDto[];
}
