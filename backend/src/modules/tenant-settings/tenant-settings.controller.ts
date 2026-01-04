import { Controller, Get, Put, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { TenantSettingsService } from './tenant-settings.service';
import { UpdateTenantSettingsDto, TenantSettingsResponseDto } from './dto/tenant-settings.dto';

@ApiTags('Tenant Settings')
@Controller('tenant-settings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TenantSettingsController {
  constructor(private readonly tenantSettingsService: TenantSettingsService) {}

  @Get()
  @ApiOperation({ summary: 'Get tenant settings' })
  @ApiResponse({ status: 200, description: 'Tenant settings', type: TenantSettingsResponseDto })
  async getSettings(@Request() req: any): Promise<TenantSettingsResponseDto> {
    const tenantId = req.user.tenantId;
    return this.tenantSettingsService.getSettings(tenantId);
  }

  @Put()
  @ApiOperation({ summary: 'Update tenant settings' })
  @ApiResponse({ status: 200, description: 'Updated tenant settings', type: TenantSettingsResponseDto })
  async updateSettings(
    @Request() req: any,
    @Body() dto: UpdateTenantSettingsDto,
  ): Promise<TenantSettingsResponseDto> {
    const tenantId = req.user.tenantId;
    return this.tenantSettingsService.updateSettings(tenantId, dto);
  }
}
