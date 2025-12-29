import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  ValidateNested,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export enum TriggerEventType {
  CARD_MOVEMENT = 'CARD_MOVEMENT',
  FORM_FIELD_CHANGE = 'FORM_FIELD_CHANGE',
}

export enum TriggerOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  GREATER_OR_EQUAL = 'GREATER_OR_EQUAL',
  LESS_OR_EQUAL = 'LESS_OR_EQUAL',
  CONTAINS = 'CONTAINS',
  NOT_CONTAINS = 'NOT_CONTAINS',
  IS_EMPTY = 'IS_EMPTY',
  IS_NOT_EMPTY = 'IS_NOT_EMPTY',
}

export class CreateTriggerConditionDto {
  @ApiProperty({ description: 'Field path to evaluate', example: 'form.status' })
  @IsString()
  @MaxLength(255)
  fieldPath: string;

  @ApiProperty({ enum: TriggerOperator, description: 'Comparison operator' })
  @IsEnum(TriggerOperator)
  operator: TriggerOperator;

  @ApiProperty({ description: 'Value to compare against', example: 'approved' })
  @IsString()
  @MaxLength(500)
  value: string;
}

export class CreateStageTriggerDto {
  @ApiProperty({ description: 'Integration ID to call when triggered' })
  @IsUUID()
  integrationId: string;

  @ApiProperty({ enum: TriggerEventType, description: 'Event type that triggers the action' })
  @IsEnum(TriggerEventType)
  eventType: TriggerEventType;

  @ApiPropertyOptional({ description: 'For CARD_MOVEMENT: filter by source stage ID' })
  @IsOptional()
  @IsUUID()
  fromStageId?: string;

  @ApiPropertyOptional({ description: 'For FORM_FIELD_CHANGE: form definition ID' })
  @IsOptional()
  @IsUUID()
  formDefinitionId?: string;

  @ApiPropertyOptional({ description: 'For FORM_FIELD_CHANGE: specific field ID' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fieldId?: string;

  @ApiPropertyOptional({ description: 'Execution order (lower = first)', default: 0 })
  @IsOptional()
  @IsInt()
  executionOrder?: number;

  @ApiPropertyOptional({ description: 'Enable/disable trigger', default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ type: [CreateTriggerConditionDto], description: 'Conditions for trigger' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTriggerConditionDto)
  conditions?: CreateTriggerConditionDto[];
}
