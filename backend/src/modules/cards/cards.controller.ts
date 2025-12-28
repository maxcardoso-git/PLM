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
import { CardsService } from './cards.service';
import { CreateCardDto, MoveCardDto, UpdateCardFormDto } from './dto';
import { TenantGuard, RequireOrganization } from '../../common/guards';
import { Tenant } from '../../common/decorators';
import type { TenantContext } from '../../common/decorators';

@ApiTags('Cards')
@Controller('cards')
@UseGuards(TenantGuard)
@RequireOrganization()
@ApiHeader({ name: 'X-Tenant-Id', required: true })
@ApiHeader({ name: 'X-Organization-Id', required: true })
export class CardsController {
  constructor(private readonly cardsService: CardsService) {}

  @Post()
  @ApiOperation({ summary: 'Create card' })
  @ApiResponse({ status: 201, description: 'Card created' })
  create(@Tenant() ctx: TenantContext, @Body() dto: CreateCardDto) {
    return this.cardsService.create(ctx, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List cards' })
  @ApiQuery({ name: 'pipeline_id', required: false })
  @ApiQuery({ name: 'stage_id', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['active', 'closed', 'archived'] })
  @ApiResponse({ status: 200, description: 'List of cards' })
  async findAll(
    @Tenant() ctx: TenantContext,
    @Query('pipeline_id') pipelineId?: string,
    @Query('stage_id') stageId?: string,
    @Query('status') status?: string,
  ) {
    const items = await this.cardsService.findAll(ctx, { pipelineId, stageId, status });
    return { items };
  }

  @Get('kanban/:pipelineId')
  @ApiOperation({ summary: 'Get Kanban board data for pipeline' })
  @ApiResponse({ status: 200, description: 'Kanban board data' })
  getKanbanBoard(
    @Tenant() ctx: TenantContext,
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
  ) {
    return this.cardsService.getKanbanBoard(ctx, pipelineId);
  }

  @Get(':cardId')
  @ApiOperation({ summary: 'Get card with forms and history' })
  @ApiResponse({ status: 200, description: 'Card details' })
  findOne(
    @Tenant() ctx: TenantContext,
    @Param('cardId', ParseUUIDPipe) cardId: string,
  ) {
    return this.cardsService.findOne(ctx, cardId);
  }

  @Post(':cardId/move')
  @ApiOperation({ summary: 'Move card to another stage' })
  @ApiResponse({ status: 200, description: 'Card moved' })
  @ApiResponse({ status: 409, description: 'Move blocked (validation error)' })
  move(
    @Tenant() ctx: TenantContext,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Body() dto: MoveCardDto,
  ) {
    return this.cardsService.move(ctx, cardId, dto);
  }

  @Patch(':cardId/forms/:formDefinitionId')
  @ApiOperation({ summary: 'Update card form data or status' })
  @ApiResponse({ status: 200, description: 'Form updated' })
  updateForm(
    @Tenant() ctx: TenantContext,
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Param('formDefinitionId', ParseUUIDPipe) formDefinitionId: string,
    @Body() dto: UpdateCardFormDto,
  ) {
    return this.cardsService.updateForm(ctx, cardId, formDefinitionId, dto);
  }
}
