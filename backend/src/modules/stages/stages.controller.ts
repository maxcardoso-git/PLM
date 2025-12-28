import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseUUIDPipe,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader } from '@nestjs/swagger';
import { StagesService } from './stages.service';
import { CreateStageDto, UpdateStageDto, CreateTransitionDto, AttachFormDto } from './dto';
import { TenantGuard, RequireOrganization } from '../../common/guards';
import { Tenant } from '../../common/decorators';
import type { TenantContext } from '../../common/decorators';

@ApiTags('Stages')
@Controller()
@UseGuards(TenantGuard)
@RequireOrganization()
@ApiHeader({ name: 'X-Tenant-Id', required: true })
@ApiHeader({ name: 'X-Organization-Id', required: true })
export class StagesController {
  constructor(private readonly stagesService: StagesService) {}

  @Post('pipelines/:pipelineId/versions/:version/stages')
  @ApiOperation({ summary: 'Create stage in pipeline version' })
  @ApiResponse({ status: 201, description: 'Stage created' })
  create(
    @Tenant() ctx: TenantContext,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Param('version', ParseIntPipe) version: number,
    @Body() dto: CreateStageDto,
  ) {
    return this.stagesService.create(ctx, pipelineId, version, dto);
  }

  @Get('pipelines/:pipelineId/versions/:version/stages')
  @ApiOperation({ summary: 'List stages for version' })
  @ApiResponse({ status: 200, description: 'List of stages' })
  async findAll(
    @Tenant() ctx: TenantContext,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Param('version', ParseIntPipe) version: number,
  ) {
    const items = await this.stagesService.findAll(ctx, pipelineId, version);
    return { items };
  }

  @Patch('stages/:stageId')
  @ApiOperation({ summary: 'Update stage' })
  @ApiResponse({ status: 200, description: 'Stage updated' })
  update(
    @Tenant() ctx: TenantContext,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Body() dto: UpdateStageDto,
  ) {
    return this.stagesService.update(ctx, stageId, dto);
  }

  @Delete('stages/:stageId')
  @ApiOperation({ summary: 'Delete stage' })
  @ApiResponse({ status: 200, description: 'Stage deleted' })
  delete(
    @Tenant() ctx: TenantContext,
    @Param('stageId', ParseUUIDPipe) stageId: string,
  ) {
    return this.stagesService.delete(ctx, stageId);
  }

  @Post('pipelines/:pipelineId/versions/:version/transitions')
  @ApiOperation({ summary: 'Create transition between stages' })
  @ApiResponse({ status: 201, description: 'Transition created' })
  createTransition(
    @Tenant() ctx: TenantContext,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Param('version', ParseIntPipe) version: number,
    @Body() dto: CreateTransitionDto,
  ) {
    return this.stagesService.createTransition(ctx, pipelineId, version, dto);
  }

  @Get('pipelines/:pipelineId/versions/:version/transitions')
  @ApiOperation({ summary: 'List transitions for version' })
  @ApiResponse({ status: 200, description: 'List of transitions' })
  async getTransitions(
    @Tenant() ctx: TenantContext,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Param('version', ParseIntPipe) version: number,
  ) {
    const items = await this.stagesService.getTransitions(ctx, pipelineId, version);
    return { items };
  }

  @Delete('transitions/:transitionId')
  @ApiOperation({ summary: 'Delete transition' })
  @ApiResponse({ status: 200, description: 'Transition deleted' })
  deleteTransition(
    @Tenant() ctx: TenantContext,
    @Param('transitionId', ParseUUIDPipe) transitionId: string,
  ) {
    return this.stagesService.deleteTransition(ctx, transitionId);
  }

  @Post('stages/:stageId/attach-forms')
  @ApiOperation({ summary: 'Attach form to stage' })
  @ApiResponse({ status: 201, description: 'Form attached' })
  attachForm(
    @Tenant() ctx: TenantContext,
    @Param('stageId', ParseUUIDPipe) stageId: string,
    @Body() dto: AttachFormDto,
  ) {
    return this.stagesService.attachForm(ctx, stageId, dto);
  }

  @Delete('stage-form-rules/:ruleId')
  @ApiOperation({ summary: 'Detach form from stage' })
  @ApiResponse({ status: 200, description: 'Form detached' })
  detachForm(
    @Tenant() ctx: TenantContext,
    @Param('ruleId', ParseUUIDPipe) ruleId: string,
  ) {
    return this.stagesService.detachForm(ctx, ruleId);
  }
}
