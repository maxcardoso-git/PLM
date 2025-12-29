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
import { StageTriggersService } from './stage-triggers.service';
import { CreateStageTriggerDto, UpdateStageTriggerDto, AddConditionDto } from './dto';
import { TenantGuard, RequireOrganization } from '../../common/guards';
import { Tenant } from '../../common/decorators';
import type { TenantContext } from '../../common/decorators';

@ApiTags('Stage Triggers')
@Controller()
@UseGuards(TenantGuard)
@RequireOrganization()
@ApiHeader({ name: 'X-Tenant-Id', required: true, description: 'Tenant UUID' })
@ApiHeader({ name: 'X-Organization-Id', required: true, description: 'Organization ID' })
export class StageTriggersController {
  constructor(private readonly stageTriggersService: StageTriggersService) {}

  @Post('stages/:stageId/triggers')
  @ApiOperation({ summary: 'Create trigger for stage' })
  @ApiResponse({ status: 201, description: 'Trigger created' })
  @ApiResponse({ status: 404, description: 'Stage or integration not found' })
  @ApiResponse({ status: 400, description: 'Invalid trigger configuration' })
  create(
    @Tenant() ctx: TenantContext,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Body() dto: CreateStageTriggerDto,
  ) {
    return this.stageTriggersService.create(ctx, stageId, dto);
  }

  @Get('stages/:stageId/triggers')
  @ApiOperation({ summary: 'List triggers for stage' })
  @ApiResponse({ status: 200, description: 'List of triggers' })
  @ApiResponse({ status: 404, description: 'Stage not found' })
  async findAllByStage(
    @Tenant() ctx: TenantContext,
    @Param('stageId', ParseUUIDPipe) stageId: string,
  ) {
    const items = await this.stageTriggersService.findAllByStage(ctx, stageId);
    return { items };
  }

  @Get('stage-triggers/:triggerId')
  @ApiOperation({ summary: 'Get trigger by ID' })
  @ApiResponse({ status: 200, description: 'Trigger found' })
  @ApiResponse({ status: 404, description: 'Trigger not found' })
  findOne(
    @Tenant() ctx: TenantContext,
    @Param('triggerId', ParseUUIDPipe) triggerId: string,
  ) {
    return this.stageTriggersService.findOne(ctx, triggerId);
  }

  @Patch('stage-triggers/:triggerId')
  @ApiOperation({ summary: 'Update trigger' })
  @ApiResponse({ status: 200, description: 'Trigger updated' })
  @ApiResponse({ status: 404, description: 'Trigger not found' })
  update(
    @Tenant() ctx: TenantContext,
    @Param('triggerId', ParseUUIDPipe) triggerId: string,
    @Body() dto: UpdateStageTriggerDto,
  ) {
    return this.stageTriggersService.update(ctx, triggerId, dto);
  }

  @Delete('stage-triggers/:triggerId')
  @ApiOperation({ summary: 'Delete trigger' })
  @ApiResponse({ status: 200, description: 'Trigger deleted' })
  @ApiResponse({ status: 404, description: 'Trigger not found' })
  delete(
    @Tenant() ctx: TenantContext,
    @Param('triggerId', ParseUUIDPipe) triggerId: string,
  ) {
    return this.stageTriggersService.delete(ctx, triggerId);
  }

  @Post('stage-triggers/:triggerId/conditions')
  @ApiOperation({ summary: 'Add condition to trigger' })
  @ApiResponse({ status: 201, description: 'Condition added' })
  @ApiResponse({ status: 404, description: 'Trigger not found' })
  addCondition(
    @Tenant() ctx: TenantContext,
    @Param('triggerId', ParseUUIDPipe) triggerId: string,
    @Body() dto: AddConditionDto,
  ) {
    return this.stageTriggersService.addCondition(ctx, triggerId, dto);
  }

  @Delete('stage-trigger-conditions/:conditionId')
  @ApiOperation({ summary: 'Remove condition from trigger' })
  @ApiResponse({ status: 200, description: 'Condition removed' })
  @ApiResponse({ status: 404, description: 'Condition not found' })
  removeCondition(
    @Tenant() ctx: TenantContext,
    @Param('conditionId', ParseUUIDPipe) conditionId: string,
  ) {
    return this.stageTriggersService.removeCondition(ctx, conditionId);
  }
}
