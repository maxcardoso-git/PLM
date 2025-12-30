import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsUUID,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum CardPriority {
  low = 'low',
  medium = 'medium',
  high = 'high',
  urgent = 'urgent',
}

export enum MoveReason {
  manual = 'manual',
  api = 'api',
  automation = 'automation',
}

export class InitialFormDto {
  @ApiProperty()
  @IsUUID()
  formDefinitionId: string;

  @ApiProperty({ enum: ['FILLED', 'TO_FILL'] })
  @IsEnum(['FILLED', 'TO_FILL'])
  status: 'FILLED' | 'TO_FILL';

  @ApiProperty()
  @IsObject()
  data: Record<string, any>;
}

export class CreateCardDto {
  @ApiProperty()
  @IsUUID()
  pipelineId: string;

  @ApiPropertyOptional({ description: 'If null, uses pipeline initial stage' })
  @IsOptional()
  @IsUUID()
  initialStageId?: string;

  @ApiProperty({ example: 'New Lead - Acme Corp' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: CardPriority, default: CardPriority.medium })
  @IsOptional()
  @IsEnum(CardPriority)
  priority?: CardPriority;

  @ApiPropertyOptional({ type: [InitialFormDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InitialFormDto)
  forms?: InitialFormDto[];
}

export class MoveCardDto {
  @ApiProperty()
  @IsUUID()
  toStageId: string;

  @ApiPropertyOptional({ enum: MoveReason, default: MoveReason.manual })
  @IsOptional()
  @IsEnum(MoveReason)
  reason?: MoveReason;
}

export class UpdateCardFormDto {
  @ApiPropertyOptional({ enum: ['FILLED', 'TO_FILL', 'LOCKED'] })
  @IsOptional()
  @IsEnum(['FILLED', 'TO_FILL', 'LOCKED'])
  status?: 'FILLED' | 'TO_FILL' | 'LOCKED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  data?: Record<string, any>;
}

export class CreateCommentDto {
  @ApiProperty({ example: 'Este cliente precisa de atenção especial.' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty({ example: 'João Silva' })
  @IsString()
  @IsNotEmpty()
  userName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  userId?: string;
}
