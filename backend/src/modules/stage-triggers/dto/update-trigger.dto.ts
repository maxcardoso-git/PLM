import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TriggerEventType, TriggerOperator } from './create-trigger.dto';

export class UpdateStageTriggerDto {
  @ApiPropertyOptional({ description: 'Integration ID to call when triggered' })
  @IsOptional()
  @IsUUID()
  integrationId?: string;

  @ApiPropertyOptional({ enum: TriggerEventType, description: 'Event type that triggers the action' })
  @IsOptional()
  @IsEnum(TriggerEventType)
  eventType?: TriggerEventType;

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

  @ApiPropertyOptional({ description: 'Execution order (lower = first)' })
  @IsOptional()
  @IsInt()
  executionOrder?: number;

  @ApiPropertyOptional({ description: 'Enable/disable trigger' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class AddConditionDto {
  @ApiPropertyOptional({ description: 'Field path to evaluate', example: 'form.status' })
  @IsString()
  @MaxLength(255)
  fieldPath: string;

  @ApiPropertyOptional({ enum: TriggerOperator, description: 'Comparison operator' })
  @IsEnum(TriggerOperator)
  operator: TriggerOperator;

  @ApiPropertyOptional({ description: 'Value to compare against', example: 'approved' })
  @IsString()
  @MaxLength(500)
  value: string;
}
