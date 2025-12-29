import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OrganizationStatus {
  active = 'active',
  inactive = 'inactive',
}

export class CreateOrganizationDto {
  @ApiProperty({ description: 'Organization code (unique identifier)', example: 'Org-1' })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ description: 'Organization name', example: 'Sales Department' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ enum: OrganizationStatus, default: OrganizationStatus.active })
  @IsOptional()
  @IsEnum(OrganizationStatus)
  status?: OrganizationStatus = OrganizationStatus.active;
}
