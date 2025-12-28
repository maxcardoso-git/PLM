import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { AutomationsService } from './automations.service';
import { CreateAutomationBindingDto, UpdateAutomationBindingDto } from './dto';
import { TenantGuard, RequireOrganization } from '../../common/guards';
import { Tenant } from '../../common/decorators';
import type { TenantContext } from '../../common/decorators';

@ApiTags('Automations')
@Controller('automations/bindings')
@UseGuards(TenantGuard)
@RequireOrganization()
@ApiHeader({ name: 'X-Tenant-Id', required: true })
@ApiHeader({ name: 'X-Organization-Id', required: true })
export class AutomationsController {
  constructor(private readonly automationsService: AutomationsService) {}

  @Post()
  @ApiOperation({ summary: 'Create automation binding' })
  @ApiResponse({ status: 201, description: 'Binding created' })
  create(@Tenant() ctx: TenantContext, @Body() dto: CreateAutomationBindingDto) {
    return this.automationsService.create(ctx, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List automation bindings' })
  @ApiQuery({ name: 'pipeline_id', required: false })
  @ApiQuery({ name: 'event_type', required: false })
  @ApiResponse({ status: 200, description: 'List of bindings' })
  async findAll(
    @Tenant() ctx: TenantContext,
    @Query('pipeline_id') pipelineId?: string,
    @Query('event_type') eventType?: string,
  ) {
    const items = await this.automationsService.findAll(ctx, pipelineId, eventType);
    return { items };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get automation binding' })
  @ApiResponse({ status: 200, description: 'Binding found' })
  findOne(
    @Tenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.automationsService.findOne(ctx, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update automation binding' })
  @ApiResponse({ status: 200, description: 'Binding updated' })
  update(
    @Tenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAutomationBindingDto,
  ) {
    return this.automationsService.update(ctx, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete automation binding' })
  @ApiResponse({ status: 200, description: 'Binding deleted' })
  delete(
    @Tenant() ctx: TenantContext,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.automationsService.delete(ctx, id);
  }

  @Post(':id/enable')
  @ApiOperation({ summary: 'Enable automation binding' })
  enable(@Tenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.automationsService.toggle(ctx, id, true);
  }

  @Post(':id/disable')
  @ApiOperation({ summary: 'Disable automation binding' })
  disable(@Tenant() ctx: TenantContext, @Param('id', ParseUUIDPipe) id: string) {
    return this.automationsService.toggle(ctx, id, false);
  }
}
