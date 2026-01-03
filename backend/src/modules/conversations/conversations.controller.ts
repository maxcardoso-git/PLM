import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ConversationsService } from './conversations.service';
import {
  ConversationResponseDto,
  ConversationWithMessagesDto,
  MessageResponseDto,
} from './dto';
import { Tenant } from '../../common/decorators';
import type { TenantContext } from '../../common/decorators';
import { TenantGuard, RequireOrganization } from '../../common/guards';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Conversations')
@Controller()
@UseGuards(JwtAuthGuard, TenantGuard)
@RequireOrganization()
@ApiHeader({ name: 'X-Tenant-Id', required: true })
@ApiHeader({ name: 'X-Organization-Id', required: true })
export class ConversationsController {
  constructor(private readonly conversationsService: ConversationsService) {}

  @Get('cards/:cardId/conversations')
  @ApiOperation({ summary: 'Get all conversations for a card' })
  @ApiParam({ name: 'cardId', description: 'Card UUID' })
  @ApiResponse({ status: 200, description: 'List of conversations', type: [ConversationResponseDto] })
  @ApiResponse({ status: 404, description: 'Card not found' })
  async getCardConversations(
    @Param('cardId', ParseUUIDPipe) cardId: string,
    @Tenant() ctx: TenantContext,
  ): Promise<ConversationResponseDto[]> {
    return this.conversationsService.getCardConversations(
      ctx.tenantId,
      ctx.orgId!,
      cardId,
    );
  }

  @Get('conversations/:id')
  @ApiOperation({ summary: 'Get conversation details with messages' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max messages to return' })
  @ApiQuery({ name: 'offset', required: false, description: 'Message offset for pagination' })
  @ApiResponse({ status: 200, description: 'Conversation with messages', type: ConversationWithMessagesDto })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getConversation(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Tenant() ctx?: TenantContext,
  ): Promise<ConversationWithMessagesDto> {
    return this.conversationsService.getConversationWithMessages(
      ctx!.tenantId,
      id,
      limit || 100,
      offset || 0,
    );
  }

  @Get('conversations/:id/messages')
  @ApiOperation({ summary: 'Get paginated messages for a conversation' })
  @ApiParam({ name: 'id', description: 'Conversation UUID' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max messages to return', example: 50 })
  @ApiQuery({ name: 'offset', required: false, description: 'Offset for pagination', example: 0 })
  @ApiResponse({ status: 200, description: 'List of messages with total count' })
  @ApiResponse({ status: 404, description: 'Conversation not found' })
  async getMessages(
    @Param('id', ParseUUIDPipe) id: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Tenant() ctx?: TenantContext,
  ): Promise<{ messages: MessageResponseDto[]; total: number }> {
    return this.conversationsService.getMessages(
      ctx!.tenantId,
      id,
      limit || 50,
      offset || 0,
    );
  }
}
