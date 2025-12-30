import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { ExternalApiService } from './external-api.service';
import {
  ExternalCreateCardDto,
  ExternalUpdateCardDto,
  ExternalUpdateFormDto,
  ExternalMoveCardDto,
  CardIdentifierType,
} from './dto';
import { ApiKeyGuard, RequireApiKeyPermissions } from '../../common/guards/api-key.guard';

@ApiTags('External API')
@ApiHeader({
  name: 'X-API-Key',
  description: 'PLM API Key for authentication',
  required: true,
})
@Controller('api/v1/external')
@UseGuards(ApiKeyGuard)
export class ExternalApiController {
  constructor(private readonly externalApiService: ExternalApiService) {}

  @Post('cards')
  @RequireApiKeyPermissions('cards:create')
  @ApiOperation({ summary: 'Create a new card' })
  @ApiResponse({ status: 201, description: 'Card created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Pipeline or stage not found' })
  @ApiResponse({ status: 409, description: 'SessionId already exists or WIP limit reached' })
  async createCard(@Req() req: any, @Body() dto: ExternalCreateCardDto) {
    const ctx = {
      tenantId: req.apiKeyAuth.tenantId,
      orgId: req.apiKeyAuth.orgId,
    };
    return this.externalApiService.createCard(ctx, dto);
  }

  @Get('cards/:identifier')
  @RequireApiKeyPermissions('cards:read')
  @ApiOperation({ summary: 'Get card by ID or sessionId' })
  @ApiParam({ name: 'identifier', description: 'Card ID or Session ID' })
  @ApiQuery({ name: 'type', enum: CardIdentifierType, required: false, description: 'Type of identifier (default: cardId)' })
  @ApiResponse({ status: 200, description: 'Card details' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async getCard(
    @Req() req: any,
    @Param('identifier') identifier: string,
    @Query('type') type: CardIdentifierType = CardIdentifierType.CARD_ID,
  ) {
    const ctx = {
      tenantId: req.apiKeyAuth.tenantId,
      orgId: req.apiKeyAuth.orgId,
    };
    return this.externalApiService.findCard(ctx, identifier, type);
  }

  @Patch('cards/:identifier')
  @RequireApiKeyPermissions('cards:update')
  @ApiOperation({ summary: 'Update card by ID or sessionId' })
  @ApiParam({ name: 'identifier', description: 'Card ID or Session ID' })
  @ApiQuery({ name: 'type', enum: CardIdentifierType, required: false, description: 'Type of identifier (default: cardId)' })
  @ApiResponse({ status: 200, description: 'Card updated successfully' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async updateCard(
    @Req() req: any,
    @Param('identifier') identifier: string,
    @Query('type') type: CardIdentifierType = CardIdentifierType.CARD_ID,
    @Body() dto: ExternalUpdateCardDto,
  ) {
    const ctx = {
      tenantId: req.apiKeyAuth.tenantId,
      orgId: req.apiKeyAuth.orgId,
    };
    return this.externalApiService.updateCard(ctx, identifier, type, dto);
  }

  @Patch('cards/:identifier/forms/:formIdentifier')
  @RequireApiKeyPermissions('forms:update')
  @ApiOperation({ summary: 'Update form data on a card' })
  @ApiParam({ name: 'identifier', description: 'Card ID or Session ID' })
  @ApiParam({ name: 'formIdentifier', description: 'Form definition ID, key, or name' })
  @ApiQuery({ name: 'type', enum: CardIdentifierType, required: false, description: 'Type of identifier (default: cardId)' })
  @ApiResponse({ status: 200, description: 'Form updated successfully' })
  @ApiResponse({ status: 400, description: 'Form is locked' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Card or form not found' })
  async updateCardForm(
    @Req() req: any,
    @Param('identifier') identifier: string,
    @Param('formIdentifier') formIdentifier: string,
    @Query('type') type: CardIdentifierType = CardIdentifierType.CARD_ID,
    @Body() dto: ExternalUpdateFormDto,
  ) {
    const ctx = {
      tenantId: req.apiKeyAuth.tenantId,
      orgId: req.apiKeyAuth.orgId,
    };
    return this.externalApiService.updateCardForm(ctx, identifier, type, formIdentifier, dto);
  }

  @Post('cards/:identifier/move')
  @RequireApiKeyPermissions('cards:move')
  @ApiOperation({ summary: 'Move card to another stage' })
  @ApiParam({ name: 'identifier', description: 'Card ID or Session ID' })
  @ApiQuery({ name: 'type', enum: CardIdentifierType, required: false, description: 'Type of identifier (default: cardId)' })
  @ApiResponse({ status: 200, description: 'Card moved successfully' })
  @ApiResponse({ status: 401, description: 'Invalid API key' })
  @ApiResponse({ status: 403, description: 'Insufficient permissions' })
  @ApiResponse({ status: 404, description: 'Card or stage not found' })
  @ApiResponse({ status: 409, description: 'Transition not allowed, WIP limit reached, or validation failed' })
  async moveCard(
    @Req() req: any,
    @Param('identifier') identifier: string,
    @Query('type') type: CardIdentifierType = CardIdentifierType.CARD_ID,
    @Body() dto: ExternalMoveCardDto,
  ) {
    const ctx = {
      tenantId: req.apiKeyAuth.tenantId,
      orgId: req.apiKeyAuth.orgId,
    };
    return this.externalApiService.moveCard(ctx, identifier, type, dto);
  }
}
