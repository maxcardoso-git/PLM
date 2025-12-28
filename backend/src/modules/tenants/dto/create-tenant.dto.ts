import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TenantStatus {
  active = 'active',
  inactive = 'inactive',
}

export class CreateTenantDto {
  @ApiProperty({ description: 'Tenant name', example: 'Acme Corp' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ enum: TenantStatus, default: TenantStatus.active })
  @IsOptional()
  @IsEnum(TenantStatus)
  status?: TenantStatus = TenantStatus.active;
}
