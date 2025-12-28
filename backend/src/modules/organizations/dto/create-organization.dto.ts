import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum OrganizationStatus {
  active = 'active',
  inactive = 'inactive',
}

export class CreateOrganizationDto {
  @ApiProperty({ description: 'Organization name', example: 'Sales Department' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ enum: OrganizationStatus, default: OrganizationStatus.active })
  @IsOptional()
  @IsEnum(OrganizationStatus)
  status?: OrganizationStatus = OrganizationStatus.active;
}
