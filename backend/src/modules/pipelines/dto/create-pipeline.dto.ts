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
