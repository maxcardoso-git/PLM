import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateGroupDto {
  @ApiProperty({ example: 'Equipe Comercial', maxLength: 255 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name: string;

  @ApiPropertyOptional({ example: 'Equipe responsável pelo pipeline de vendas' })
  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateGroupDto {
  @ApiPropertyOptional({ example: 'Equipe Comercial', maxLength: 255 })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ example: 'Equipe responsável pelo pipeline de vendas' })
  @IsOptional()
  @IsString()
  description?: string;
}
