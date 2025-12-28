import { IsString, IsNotEmpty, IsOptional, IsBoolean, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum PLMEventType {
  PLM_PIPE_CREATED = 'PLM_PIPE_CREATED',
  PLM_PIPE_PUBLISHED = 'PLM_PIPE_PUBLISHED',
  PLM_PIPE_CLOSED = 'PLM_PIPE_CLOSED',
  PLM_CARD_CREATED = 'PLM_CARD_CREATED',
  PLM_CARD_MOVED = 'PLM_CARD_MOVED',
  PLM_CARD_CLOSED = 'PLM_CARD_CLOSED',
}

export class CreateAutomationBindingDto {
  @ApiProperty()
  @IsUUID()
  pipelineId: string;

  @ApiProperty({ enum: PLMEventType })
  @IsEnum(PLMEventType)
  eventType: PLMEventType;

  @ApiPropertyOptional({ description: 'Filter: trigger only when moving from this stage' })
  @IsOptional()
  @IsUUID()
  filterFromStageId?: string;

  @ApiPropertyOptional({ description: 'Filter: trigger only when moving to this stage' })
  @IsOptional()
  @IsUUID()
  filterToStageId?: string;

  @ApiProperty({ description: 'External automation plan ID from Orchestrator' })
  @IsUUID()
  automationPlanId: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateAutomationBindingDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  filterFromStageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  filterToStageId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  automationPlanId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
