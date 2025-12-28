import { IsString, IsNotEmpty, IsOptional, IsInt, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateFormDefinitionDto {
  @ApiProperty({ example: 'Lead Base' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsInt()
  version?: number;

  @ApiProperty({
    description: 'JSON schema of fields',
    example: {
      fields: [
        { id: 'name', type: 'text', label: 'Name', required: true },
        { id: 'email', type: 'email', label: 'Email', required: true },
      ],
    },
  })
  @IsObject()
  schemaJson: Record<string, any>;
}

export class UpdateFormDefinitionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  schemaJson?: Record<string, any>;
}
