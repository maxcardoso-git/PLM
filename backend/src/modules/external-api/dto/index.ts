import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsObject,
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
