import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional, IsArray, IsIn } from 'class-validator';

export class CreateAppFeatureDto {
  @ApiProperty({ description: 'Feature ID (format: appId.featureName)' })
  @IsString()
  id: string;

  @ApiProperty({ description: 'Feature name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ description: 'Feature description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: 'Module this feature belongs to' })
  @IsString()
  module: string;

  @ApiPropertyOptional({ description: 'Frontend route path' })
  @IsString()
  @IsOptional()
  path?: string;

  @ApiPropertyOptional({ description: 'Lucide icon name' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: 'Available actions', type: [String] })
  @IsArray()
  @IsOptional()
  actions?: string[];

  @ApiPropertyOptional({ description: 'Is this a public feature (no auth)' })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Requires organization context' })
  @IsBoolean()
  @IsOptional()
  requiresOrg?: boolean;
}

export class UpdateAppFeatureDto {
  @ApiPropertyOptional({ description: 'Feature name' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ description: 'Feature description' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ description: 'Frontend route path' })
  @IsString()
  @IsOptional()
  path?: string;

  @ApiPropertyOptional({ description: 'Lucide icon name' })
  @IsString()
  @IsOptional()
  icon?: string;

  @ApiPropertyOptional({ description: 'Available actions', type: [String] })
  @IsArray()
  @IsOptional()
  actions?: string[];

  @ApiPropertyOptional({ description: 'Is this a public feature (no auth)' })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;

  @ApiPropertyOptional({ description: 'Requires organization context' })
  @IsBoolean()
  @IsOptional()
  requiresOrg?: boolean;
}
