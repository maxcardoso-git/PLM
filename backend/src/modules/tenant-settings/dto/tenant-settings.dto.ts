import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class ExternalFormsConfigDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  listEndpoint?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  schemaEndpoint?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  dataEndpoint?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class ExternalProjectsConfigDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  listEndpoint?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class ApiKeysServiceConfigDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  baseUrl?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  listEndpoint?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  apiKey?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateTenantSettingsDto {
  @ApiProperty({ required: false, type: ExternalFormsConfigDto })
  @IsOptional()
  externalForms?: ExternalFormsConfigDto;

  @ApiProperty({ required: false, type: ExternalProjectsConfigDto })
  @IsOptional()
  externalProjects?: ExternalProjectsConfigDto;

  @ApiProperty({ required: false, type: ApiKeysServiceConfigDto })
  @IsOptional()
  apiKeysService?: ApiKeysServiceConfigDto;
}

export class TenantSettingsResponseDto {
  @ApiProperty()
  externalForms: {
    baseUrl: string;
    listEndpoint: string;
    schemaEndpoint: string;
    dataEndpoint: string;
    apiKey: string;
    enabled: boolean;
  };

  @ApiProperty()
  externalProjects: {
    baseUrl: string;
    listEndpoint: string;
    apiKey: string;
    enabled: boolean;
  };

  @ApiProperty()
  apiKeysService: {
    baseUrl: string;
    listEndpoint: string;
    apiKey: string;
    enabled: boolean;
  };
}
