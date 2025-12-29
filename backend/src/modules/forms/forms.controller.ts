import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiHeader, ApiQuery } from '@nestjs/swagger';
import { FormsService } from './forms.service';
import { CreateFormDefinitionDto, UpdateFormDefinitionDto } from './dto';
import { TenantGuard } from '../../common/guards';
import { Tenant } from '../../common/decorators';
import type { TenantContext } from '../../common/decorators';

@ApiTags('Pipelines')
@Controller('forms')
@UseGuards(TenantGuard)
@ApiHeader({ name: 'X-Tenant-Id', required: true })
@ApiHeader({ name: 'X-Organization-Id', required: false })
export class FormsController {
  constructor(private readonly formsService: FormsService) {}

  @Post()
  @ApiOperation({ summary: 'Create form definition (draft)' })
  @ApiResponse({ status: 201, description: 'Form created' })
  create(@Tenant() ctx: TenantContext, @Body() dto: CreateFormDefinitionDto) {
    return this.formsService.create(ctx, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List form definitions' })
  @ApiQuery({ name: 'status', required: false, enum: ['draft', 'published', 'archived'] })
  @ApiResponse({ status: 200, description: 'List of forms' })
  async findAll(@Tenant() ctx: TenantContext, @Query('status') status?: string) {
    const items = await this.formsService.findAll(ctx, status);
    return { items };
  }

  @Get(':formId/pipelines')
  @ApiOperation({ summary: 'Get pipelines that use this form' })
  @ApiResponse({ status: 200, description: 'List of pipelines with linked stages' })
  async findLinkedPipelines(
    @Tenant() ctx: TenantContext,
    @Param('formId') formId: string,
  ) {
    const items = await this.formsService.findLinkedPipelines(ctx, formId);
    return { items };
  }

  @Get(':formId')
  @ApiOperation({ summary: 'Get form definition' })
  @ApiResponse({ status: 200, description: 'Form found' })
  findOne(
    @Tenant() ctx: TenantContext,
    @Param('formId', ParseUUIDPipe) formId: string,
  ) {
    return this.formsService.findOne(ctx, formId);
  }

  @Patch(':formId')
  @ApiOperation({ summary: 'Update form definition (draft only)' })
  @ApiResponse({ status: 200, description: 'Form updated' })
  update(
    @Tenant() ctx: TenantContext,
    @Param('formId', ParseUUIDPipe) formId: string,
    @Body() dto: UpdateFormDefinitionDto,
  ) {
    return this.formsService.update(ctx, formId, dto);
  }

  @Post(':formId/publish')
  @ApiOperation({ summary: 'Publish form definition' })
  @ApiResponse({ status: 200, description: 'Form published' })
  publish(
    @Tenant() ctx: TenantContext,
    @Param('formId', ParseUUIDPipe) formId: string,
  ) {
    return this.formsService.publish(ctx, formId);
  }

  @Post(':formId/archive')
  @ApiOperation({ summary: 'Archive form definition' })
  @ApiResponse({ status: 200, description: 'Form archived' })
  archive(
    @Tenant() ctx: TenantContext,
    @Param('formId', ParseUUIDPipe) formId: string,
  ) {
    return this.formsService.archive(ctx, formId);
  }

  @Post(':formId/new-version')
  @ApiOperation({ summary: 'Create new version from existing form' })
  @ApiResponse({ status: 201, description: 'New version created' })
  createNewVersion(
    @Tenant() ctx: TenantContext,
    @Param('formId', ParseUUIDPipe) formId: string,
    @Body() dto: UpdateFormDefinitionDto,
  ) {
    return this.formsService.createNewVersion(ctx, formId, dto);
  }
}
