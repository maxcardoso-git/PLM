import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { PlmApiKeysService } from './plm-api-keys.service';
import { CreatePlmApiKeyDto, UpdatePlmApiKeyDto, API_KEY_PERMISSIONS } from './dto';
import { TenantGuard, RequireOrganization } from '../../common/guards';
import { Tenant } from '../../common/decorators';
import type { TenantContext } from '../../common/decorators';

@ApiTags('PLM API Keys')
@Controller('plm-api-keys')
@UseGuards(TenantGuard)
@RequireOrganization()
@ApiHeader({ name: 'X-Tenant-Id', required: true, description: 'Tenant UUID' })
@ApiHeader({ name: 'X-Organization-Id', required: true, description: 'Organization ID' })
export class PlmApiKeysController {
  constructor(private readonly plmApiKeysService: PlmApiKeysService) {}

  @Get('permissions')
  @ApiOperation({ summary: 'List available permissions for API keys' })
  @ApiResponse({ status: 200, description: 'List of available permissions' })
  getPermissions() {
    return {
      permissions: API_KEY_PERMISSIONS.map((p) => ({
        key: p,
        description: this.getPermissionDescription(p),
      })),
    };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new API key' })
  @ApiResponse({ status: 201, description: 'API key created (key is only shown once!)' })
  create(@Tenant() ctx: TenantContext, @Body() dto: CreatePlmApiKeyDto) {
    return this.plmApiKeysService.create(ctx, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all API keys' })
  @ApiResponse({ status: 200, description: 'List of API keys (keys are masked)' })
  async findAll(@Tenant() ctx: TenantContext) {
    const items = await this.plmApiKeysService.findAll(ctx);
    // Mask keys in response
    return {
      items: items.map((item) => ({
        ...item,
        key: this.plmApiKeysService.maskKey(item.key),
      })),
    };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get API key by ID' })
  @ApiResponse({ status: 200, description: 'API key details (key is masked)' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  async findOne(@Tenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    const apiKey = await this.plmApiKeysService.findOne(ctx, id);
    return {
      ...apiKey,
      key: this.plmApiKeysService.maskKey(apiKey.key),
    };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update API key' })
  @ApiResponse({ status: 200, description: 'API key updated' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  update(
    @Tenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePlmApiKeyDto,
  ) {
    return this.plmApiKeysService.update(ctx, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete API key' })
  @ApiResponse({ status: 200, description: 'API key deleted' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  delete(@Tenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.plmApiKeysService.delete(ctx, id);
  }

  @Post(':id/regenerate')
  @ApiOperation({ summary: 'Regenerate API key (new key returned only once!)' })
  @ApiResponse({ status: 200, description: 'New API key generated' })
  @ApiResponse({ status: 404, description: 'API key not found' })
  regenerate(@Tenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.plmApiKeysService.regenerate(ctx, id);
  }

  private getPermissionDescription(permission: string): string {
    const descriptions: Record<string, string> = {
      'cards:create': 'Create new cards in pipelines',
      'cards:read': 'Read card details and data',
      'cards:update': 'Update card title, description, and priority',
      'cards:move': 'Move cards between pipeline stages',
      'forms:update': 'Update form data attached to cards',
    };
    return descriptions[permission] || permission;
  }
}
