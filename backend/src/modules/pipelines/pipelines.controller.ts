import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { PipelinesService } from './pipelines.service';
import { CreatePipelineDto, UpdatePipelineDto, ClonePipelineVersionDto } from './dto';
import { TenantGuard, RequireOrganization } from '../../common/guards';
import { Tenant } from '../../common/decorators';
import type { TenantContext } from '../../common/decorators';

@ApiTags('Pipelines')
@Controller('pipelines')
@UseGuards(TenantGuard)
@RequireOrganization()
@ApiHeader({ name: 'X-Tenant-Id', required: true, description: 'Tenant UUID' })
@ApiHeader({ name: 'X-Organization-Id', required: true, description: 'Organization UUID' })
export class PipelinesController {
  constructor(private readonly pipelinesService: PipelinesService) {}

  @Post()
  @ApiOperation({ summary: 'Create pipeline (creates version 1 as draft)' })
  @ApiResponse({ status: 201, description: 'Pipeline created' })
  create(@Tenant() ctx: TenantContext, @Body() dto: CreatePipelineDto) {
    return this.pipelinesService.create(ctx, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List pipelines' })
  @ApiQuery({ name: 'lifecycle_status', required: false, enum: ['draft', 'test', 'published', 'closed', 'archived'] })
  @ApiResponse({ status: 200, description: 'List of pipelines' })
  async findAll(
    @Tenant() ctx: TenantContext,
    @Query('lifecycle_status') lifecycleStatus?: string,
  ) {
    const items = await this.pipelinesService.findAll(ctx, lifecycleStatus);
    return { items };
  }

  @Get(':pipelineId')
  @ApiOperation({ summary: 'Get pipeline by ID' })
  @ApiResponse({ status: 200, description: 'Pipeline found' })
  findOne(
    @Tenant() ctx: TenantContext,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
  ) {
    return this.pipelinesService.findOne(ctx, pipelineId);
  }

  @Patch(':pipelineId')
  @ApiOperation({ summary: 'Update pipeline metadata' })
  @ApiResponse({ status: 200, description: 'Pipeline updated' })
  update(
    @Tenant() ctx: TenantContext,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Body() dto: UpdatePipelineDto,
  ) {
    return this.pipelinesService.update(ctx, pipelineId, dto);
  }

  @Post(':pipelineId/close')
  @ApiOperation({ summary: 'Close pipeline' })
  @ApiResponse({ status: 200, description: 'Pipeline closed' })
  close(
    @Tenant() ctx: TenantContext,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
  ) {
    return this.pipelinesService.close(ctx, pipelineId);
  }

  @Get(':pipelineId/versions')
  @ApiOperation({ summary: 'List pipeline versions' })
  @ApiResponse({ status: 200, description: 'List of versions' })
  async getVersions(
    @Tenant() ctx: TenantContext,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
  ) {
    const items = await this.pipelinesService.getVersions(ctx, pipelineId);
    return { items };
  }

  @Post(':pipelineId/versions')
  @ApiOperation({ summary: 'Create new draft version (clone)' })
  @ApiResponse({ status: 201, description: 'Version created' })
  cloneVersion(
    @Tenant() ctx: TenantContext,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Body() dto: ClonePipelineVersionDto,
  ) {
    return this.pipelinesService.cloneVersion(ctx, pipelineId, dto);
  }

  @Get(':pipelineId/versions/:version')
  @ApiOperation({ summary: 'Get pipeline version details' })
  @ApiResponse({ status: 200, description: 'Version found' })
  getVersion(
    @Tenant() ctx: TenantContext,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Param('version', ParseIntPipe) version: number,
  ) {
    return this.pipelinesService.getVersion(ctx, pipelineId, version);
  }

  @Post(':pipelineId/versions/:version/publish')
  @ApiOperation({ summary: 'Publish pipeline version' })
  @ApiResponse({ status: 200, description: 'Version published' })
  publishVersion(
    @Tenant() ctx: TenantContext,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Param('version', ParseIntPipe) version: number,
  ) {
    return this.pipelinesService.publishVersion(ctx, pipelineId, version);
  }
}
