import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { PipelinePermissionsService } from './pipeline-permissions.service';
import {
  AssignPermissionDto,
  UpdatePermissionDto,
  PermissionResponseDto,
} from './dto';
import { TenantContext } from '../../common/decorators/tenant.decorator';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../auth/dto/tah-callback.dto';

interface TenantCtx {
  tenantId: string;
  orgId: string;
}

@ApiTags('Pipeline Permissions')
@ApiBearerAuth()
@Controller()
export class PipelinePermissionsController {
  constructor(
    private readonly permissionsService: PipelinePermissionsService,
  ) {}

  // ==================== Pipeline Permission Endpoints ====================

  @Get('pipelines/:pipelineId/permissions')
  @ApiOperation({ summary: 'Listar permissões do pipeline' })
  @ApiParam({ name: 'pipelineId', description: 'ID do pipeline' })
  @ApiResponse({ status: 200, description: 'Lista de permissões' })
  async getPermissions(
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @TenantContext() ctx: TenantCtx,
  ): Promise<PermissionResponseDto[]> {
    return this.permissionsService.getPermissions(
      ctx.tenantId,
      ctx.orgId,
      pipelineId,
    );
  }

  @Post('pipelines/:pipelineId/permissions')
  @ApiOperation({ summary: 'Atribuir permissão a um grupo' })
  @ApiParam({ name: 'pipelineId', description: 'ID do pipeline' })
  @ApiResponse({ status: 201, description: 'Permissão atribuída' })
  @ApiResponse({ status: 404, description: 'Pipeline ou grupo não encontrado' })
  @ApiResponse({ status: 409, description: 'Grupo já possui permissão' })
  async assignPermission(
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Body() dto: AssignPermissionDto,
    @TenantContext() ctx: TenantCtx,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<PermissionResponseDto> {
    return this.permissionsService.assignPermission(
      ctx.tenantId,
      ctx.orgId,
      pipelineId,
      dto,
      user.id,
    );
  }

  @Patch('pipelines/:pipelineId/permissions/:permissionId')
  @ApiOperation({ summary: 'Atualizar permissão' })
  @ApiParam({ name: 'pipelineId', description: 'ID do pipeline' })
  @ApiParam({ name: 'permissionId', description: 'ID da permissão' })
  @ApiResponse({ status: 200, description: 'Permissão atualizada' })
  @ApiResponse({ status: 404, description: 'Permissão não encontrada' })
  async updatePermission(
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
    @Body() dto: UpdatePermissionDto,
    @TenantContext() ctx: TenantCtx,
  ): Promise<PermissionResponseDto> {
    return this.permissionsService.updatePermission(
      ctx.tenantId,
      ctx.orgId,
      pipelineId,
      permissionId,
      dto,
    );
  }

  @Delete('pipelines/:pipelineId/permissions/:permissionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover permissão' })
  @ApiParam({ name: 'pipelineId', description: 'ID do pipeline' })
  @ApiParam({ name: 'permissionId', description: 'ID da permissão' })
  @ApiResponse({ status: 204, description: 'Permissão removida' })
  @ApiResponse({ status: 404, description: 'Permissão não encontrada' })
  async removePermission(
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @Param('permissionId', ParseUUIDPipe) permissionId: string,
    @TenantContext() ctx: TenantCtx,
  ): Promise<void> {
    return this.permissionsService.removePermission(
      ctx.tenantId,
      ctx.orgId,
      pipelineId,
      permissionId,
    );
  }

  @Get('pipelines/:pipelineId/my-permission')
  @ApiOperation({ summary: 'Obter minha permissão no pipeline' })
  @ApiParam({ name: 'pipelineId', description: 'ID do pipeline' })
  @ApiResponse({ status: 200, description: 'Permissão do usuário' })
  async getMyPermission(
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @TenantContext() ctx: TenantCtx,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const permission = await this.permissionsService.getUserPermission(
      ctx.tenantId,
      ctx.orgId,
      pipelineId,
      user.id,
    );

    return {
      hasAccess: !!permission,
      permission,
    };
  }

  @Get('pipelines/:pipelineId/available-groups')
  @ApiOperation({ summary: 'Listar grupos disponíveis para atribuir permissão' })
  @ApiParam({ name: 'pipelineId', description: 'ID do pipeline' })
  @ApiResponse({ status: 200, description: 'Lista de grupos disponíveis' })
  async getAvailableGroups(
    @Param('pipelineId', ParseUUIDPipe) pipelineId: string,
    @TenantContext() ctx: TenantCtx,
  ) {
    return this.permissionsService.getAvailableGroups(
      ctx.tenantId,
      ctx.orgId,
      pipelineId,
    );
  }

  // ==================== Published Pipelines Endpoints ====================

  @Get('published-pipelines')
  @ApiOperation({ summary: 'Listar pipelines publicados que o usuário tem acesso' })
  @ApiResponse({ status: 200, description: 'Lista de pipelines' })
  async getAccessiblePipelines(
    @TenantContext() ctx: TenantCtx,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.permissionsService.getAccessiblePipelines(
      ctx.tenantId,
      ctx.orgId,
      user.id,
    );
  }

  @Get('published-pipelines/by-project')
  @ApiOperation({ summary: 'Listar pipelines publicados agrupados por projeto' })
  @ApiResponse({ status: 200, description: 'Pipelines agrupados por projeto' })
  async getAccessiblePipelinesByProject(
    @TenantContext() ctx: TenantCtx,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.permissionsService.getAccessiblePipelinesByProject(
      ctx.tenantId,
      ctx.orgId,
      user.id,
    );
  }
}
