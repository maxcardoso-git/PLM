import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Delete,
  Param,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { IntegrationsService } from './integrations.service';
import { CreateIntegrationDto, UpdateIntegrationDto, TestIntegrationDto } from './dto';
import { TenantGuard, RequireOrganization } from '../../common/guards';
import { Tenant } from '../../common/decorators';
import type { TenantContext } from '../../common/decorators';

@ApiTags('Integrations')
@Controller('integrations')
@UseGuards(TenantGuard)
@RequireOrganization()
@ApiHeader({ name: 'X-Tenant-Id', required: true, description: 'Tenant UUID' })
@ApiHeader({ name: 'X-Organization-Id', required: true, description: 'Organization ID' })
export class IntegrationsController {
  constructor(private readonly integrationsService: IntegrationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create integration' })
  @ApiResponse({ status: 201, description: 'Integration created' })
  @ApiResponse({ status: 409, description: 'Integration with key already exists' })
  create(@Tenant() ctx: TenantContext, @Body() dto: CreateIntegrationDto) {
    return this.integrationsService.create(ctx, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List integrations' })
  @ApiResponse({ status: 200, description: 'List of integrations' })
  async findAll(@Tenant() ctx: TenantContext) {
    const items = await this.integrationsService.findAll(ctx);
    return { items };
  }

  @Get(':integrationId')
  @ApiOperation({ summary: 'Get integration by ID' })
  @ApiResponse({ status: 200, description: 'Integration found' })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  findOne(
    @Tenant() ctx: TenantContext,
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
  ) {
    return this.integrationsService.findOne(ctx, integrationId);
  }

  @Patch(':integrationId')
  @ApiOperation({ summary: 'Update integration' })
  @ApiResponse({ status: 200, description: 'Integration updated' })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  update(
    @Tenant() ctx: TenantContext,
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
    @Body() dto: UpdateIntegrationDto,
  ) {
    return this.integrationsService.update(ctx, integrationId, dto);
  }

  @Delete(':integrationId')
  @ApiOperation({ summary: 'Delete integration' })
  @ApiResponse({ status: 200, description: 'Integration deleted' })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  delete(
    @Tenant() ctx: TenantContext,
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
  ) {
    return this.integrationsService.delete(ctx, integrationId);
  }

  @Post(':integrationId/test')
  @ApiOperation({ summary: 'Test integration with payload' })
  @ApiResponse({ status: 200, description: 'Test configuration returned' })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  test(
    @Tenant() ctx: TenantContext,
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
    @Body() dto: TestIntegrationDto,
  ) {
    return this.integrationsService.test(ctx, integrationId, dto.payload || {});
  }

  @Get(':integrationId/usage')
  @ApiOperation({ summary: 'Get integration usage in pipelines' })
  @ApiResponse({ status: 200, description: 'Integration usage details' })
  @ApiResponse({ status: 404, description: 'Integration not found' })
  getUsage(
    @Tenant() ctx: TenantContext,
    @Param('integrationId', ParseUUIDPipe) integrationId: string,
  ) {
    return this.integrationsService.getUsage(ctx, integrationId);
  }
}
