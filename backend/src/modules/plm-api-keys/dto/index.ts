import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsEnum,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export const API_KEY_PERMISSIONS = [
  'cards:create',
  'cards:read',
  'cards:update',
  'cards:move',
  'forms:update',
  'conversations:write',
  'pipelines:read',
] as const;

export type ApiKeyPermission = (typeof API_KEY_PERMISSIONS)[number];

export class CreatePlmApiKeyDto {
  @ApiProperty({ example: 'Flow Integration Key' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'API key for Flow chat integration' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: ['cards:create', 'cards:read', 'cards:move'],
    enum: API_KEY_PERMISSIONS,
    isArray: true,
  })
  @IsArray()
  @IsEnum(API_KEY_PERMISSIONS, { each: true })
  permissions: ApiKeyPermission[];

  @ApiPropertyOptional({ example: '2025-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

export class UpdatePlmApiKeyDto {
  @ApiPropertyOptional({ example: 'Updated Key Name' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'Updated description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    example: ['cards:create', 'cards:read'],
    enum: API_KEY_PERMISSIONS,
    isArray: true,
  })
  @IsOptional()
  @IsArray()
  @IsEnum(API_KEY_PERMISSIONS, { each: true })
  permissions?: ApiKeyPermission[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @ApiPropertyOptional({ example: '2026-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
