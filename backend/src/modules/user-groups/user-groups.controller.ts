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
import { UserGroupsService } from './user-groups.service';
import { CreateGroupDto, UpdateGroupDto, AddMembersDto } from './dto';
import { TenantGuard, RequireOrganization } from '../../common/guards';
import { Tenant } from '../../common/decorators';
import type { TenantContext } from '../../common/decorators';

@ApiTags('User Groups')
@Controller('user-groups')
@UseGuards(TenantGuard)
@RequireOrganization()
@ApiHeader({ name: 'X-Tenant-Id', required: true })
@ApiHeader({ name: 'X-Organization-Id', required: true })
export class UserGroupsController {
  constructor(private readonly userGroupsService: UserGroupsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new user group' })
  @ApiResponse({ status: 201, description: 'Group created' })
  @ApiResponse({ status: 409, description: 'Group name already exists' })
  create(@Tenant() ctx: TenantContext, @Body() dto: CreateGroupDto) {
    return this.userGroupsService.create(ctx, dto, ctx.userId);
  }

  @Get()
  @ApiOperation({ summary: 'List all user groups' })
  @ApiResponse({ status: 200, description: 'List of groups' })
  findAll(@Tenant() ctx: TenantContext) {
    return this.userGroupsService.findAll(ctx);
  }

  @Get(':groupId')
  @ApiOperation({ summary: 'Get user group details with members' })
  @ApiResponse({ status: 200, description: 'Group details' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  findOne(
    @Tenant() ctx: TenantContext,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ) {
    return this.userGroupsService.findOne(ctx, groupId);
  }

  @Patch(':groupId')
  @ApiOperation({ summary: 'Update user group' })
  @ApiResponse({ status: 200, description: 'Group updated' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  @ApiResponse({ status: 409, description: 'Group name already exists' })
  update(
    @Tenant() ctx: TenantContext,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: UpdateGroupDto,
  ) {
    return this.userGroupsService.update(ctx, groupId, dto);
  }

  @Delete(':groupId')
  @ApiOperation({ summary: 'Delete user group' })
  @ApiResponse({ status: 200, description: 'Group deleted' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  delete(
    @Tenant() ctx: TenantContext,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ) {
    return this.userGroupsService.delete(ctx, groupId);
  }

  // Member management
  @Get(':groupId/members')
  @ApiOperation({ summary: 'Get group members' })
  @ApiResponse({ status: 200, description: 'List of members' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  getMembers(
    @Tenant() ctx: TenantContext,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ) {
    return this.userGroupsService.getMembers(ctx, groupId);
  }

  @Post(':groupId/members')
  @ApiOperation({ summary: 'Add members to group' })
  @ApiResponse({ status: 201, description: 'Members added' })
  @ApiResponse({ status: 404, description: 'Group or users not found' })
  addMembers(
    @Tenant() ctx: TenantContext,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Body() dto: AddMembersDto,
  ) {
    return this.userGroupsService.addMembers(ctx, groupId, dto, ctx.userId);
  }

  @Delete(':groupId/members/:userId')
  @ApiOperation({ summary: 'Remove member from group' })
  @ApiResponse({ status: 200, description: 'Member removed' })
  @ApiResponse({ status: 404, description: 'Group or member not found' })
  removeMember(
    @Tenant() ctx: TenantContext,
    @Param('groupId', ParseUUIDPipe) groupId: string,
    @Param('userId', ParseUUIDPipe) userId: string,
  ) {
    return this.userGroupsService.removeMember(ctx, groupId, userId);
  }

  @Get(':groupId/available-users')
  @ApiOperation({ summary: 'Get users not in this group' })
  @ApiResponse({ status: 200, description: 'List of available users' })
  @ApiResponse({ status: 404, description: 'Group not found' })
  getAvailableUsers(
    @Tenant() ctx: TenantContext,
    @Param('groupId', ParseUUIDPipe) groupId: string,
  ) {
    return this.userGroupsService.getAvailableUsers(ctx, groupId);
  }
}
