import {
  IsString,
  IsNotEmpty,
  IsInt,
  IsBoolean,
  IsOptional,
  IsEnum,
  Matches,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum StageClassification {
  NOT_STARTED = 'NOT_STARTED',
  ON_GOING = 'ON_GOING',
  WAITING = 'WAITING',
  FINISHED = 'FINISHED',
  CANCELED = 'CANCELED',
}

export class CreateStageDto {
  @ApiProperty({ example: 'New Lead' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  stageOrder: number;

  @ApiProperty({ enum: StageClassification })
  @IsEnum(StageClassification)
  classification: StageClassification;

  @ApiProperty({ example: '#3B82F6', description: 'HEX color' })
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Color must be a valid HEX code (#RRGGBB)' })
  color: string;

  @ApiProperty({ example: false })
  @IsBoolean()
  isInitial: boolean;

  @ApiProperty({ example: false })
  @IsBoolean()
  isFinal: boolean;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  wipLimit?: number;

  @ApiPropertyOptional({ example: 48 })
  @IsOptional()
  @IsInt()
  slaHours?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateStageDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  stageOrder?: number;

  @ApiPropertyOptional({ enum: StageClassification })
  @IsOptional()
  @IsEnum(StageClassification)
  classification?: StageClassification;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/)
  color?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isInitial?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isFinal?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  wipLimit?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  slaHours?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateTransitionDto {
  @ApiProperty()
  @IsUUID()
  fromStageId: string;

  @ApiProperty()
  @IsUUID()
  toStageId: string;
}

export class AttachFormDto {
  @ApiPropertyOptional({ description: 'ID of local form definition (UUID)' })
  @IsOptional()
  @IsUUID()
  formDefinitionId?: string;

  @ApiPropertyOptional({ description: 'ID of external form (any string format)' })
  @IsOptional()
  @IsString()
  externalFormId?: string;

  @ApiPropertyOptional({ description: 'Name of external form for display' })
  @IsOptional()
  @IsString()
  externalFormName?: string;

  @ApiPropertyOptional({ description: 'Version of external form' })
  @IsOptional()
  @IsInt()
  externalFormVersion?: number;

  @ApiProperty({ enum: ['FILLED', 'TO_FILL'] })
  @IsEnum(['FILLED', 'TO_FILL'])
  defaultFormStatus: 'FILLED' | 'TO_FILL';

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  lockOnLeaveStage?: boolean;
}

// Transition Rule Types
export enum TransitionRuleType {
  FORM_REQUIRED = 'FORM_REQUIRED',
  COMMENT_REQUIRED = 'COMMENT_REQUIRED',
  OWNER_ONLY = 'OWNER_ONLY',
}

export class CreateTransitionRuleDto {
  @ApiProperty({ enum: TransitionRuleType })
  @IsEnum(TransitionRuleType)
  ruleType: TransitionRuleType;

  @ApiPropertyOptional({ description: 'Form definition ID (required for FORM_REQUIRED rule)' })
  @IsOptional()
  @IsUUID()
  formDefinitionId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateTransitionRuleDto {
  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
