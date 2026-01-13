import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePipelineDto {
  @ApiProperty({ description: 'Pipeline stable key', example: 'sales_pipeline' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  key: string;

  @ApiProperty({ description: 'Pipeline name', example: 'Sales Pipeline' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Pipeline description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'External project ID', example: 'proj-123' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  projectId?: string;

  @ApiPropertyOptional({ description: 'External project name', example: 'My Project' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  projectName?: string;

  @ApiPropertyOptional({ description: 'Orchestrator domain for ISC integration', example: 'credit-recovery' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  domain?: string;

  @ApiPropertyOptional({ description: 'Domain description for AI agents context', example: 'Recuperação de crédito e negociação de dívidas' })
  @IsOptional()
  @IsString()
  domainDescription?: string;
}

export class UpdatePipelineDto {
  @ApiPropertyOptional({ description: 'Pipeline name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Pipeline description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'External project ID', example: 'proj-123' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  projectId?: string;

  @ApiPropertyOptional({ description: 'External project name', example: 'My Project' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  projectName?: string;

  @ApiPropertyOptional({ description: 'Orchestrator domain for ISC integration', example: 'credit-recovery' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  domain?: string;

  @ApiPropertyOptional({ description: 'Domain description for AI agents context' })
  @IsOptional()
  @IsString()
  domainDescription?: string;
}

export class ClonePipelineVersionDto {
  @ApiPropertyOptional({ description: 'Version to clone from. If null, clones from published version' })
  @IsOptional()
  fromVersion?: number;

  @ApiPropertyOptional({ enum: ['draft', 'test'], default: 'draft' })
  @IsOptional()
  @IsString()
  targetStatus?: 'draft' | 'test';
}
