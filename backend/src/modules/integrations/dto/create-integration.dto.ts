import { IsString, IsNotEmpty, IsOptional, MaxLength, IsBoolean, IsIn, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateIntegrationDto {
  @ApiProperty({ description: 'Integration stable key', example: 'customers_api' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  key: string;

  @ApiProperty({ description: 'Integration name (pipeline-friendly)', example: 'Customers' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ description: 'Integration description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'External API Key ID from API-keys service' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  externalApiKeyId: string;

  @ApiPropertyOptional({ description: 'External API Key name (for display)' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  externalApiKeyName?: string;

  @ApiPropertyOptional({ description: 'HTTP method', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], default: 'POST' })
  @IsOptional()
  @IsString()
  @IsIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
  httpMethod?: string;

  @ApiPropertyOptional({ description: 'Endpoint override (optional)' })
  @IsOptional()
  @IsString()
  endpoint?: string;

  @ApiPropertyOptional({ description: 'Default payload template for testing' })
  @IsOptional()
  @IsObject()
  defaultPayload?: Record<string, any>;
}

export class UpdateIntegrationDto {
  @ApiPropertyOptional({ description: 'Integration name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Integration description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'HTTP method', enum: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] })
  @IsOptional()
  @IsString()
  @IsIn(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'])
  httpMethod?: string;

  @ApiPropertyOptional({ description: 'Endpoint override' })
  @IsOptional()
  @IsString()
  endpoint?: string;

  @ApiPropertyOptional({ description: 'Default payload template' })
  @IsOptional()
  @IsObject()
  defaultPayload?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Enable/disable integration' })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class TestIntegrationDto {
  @ApiPropertyOptional({ description: 'Test payload to send' })
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;
}
