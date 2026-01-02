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
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiHeader,
  ApiParam,
} from '@nestjs/swagger';
import { PipelinePermissionsService } from './pipeline-permissions.service';
import {
  AssignPermissionDto,
  UpdatePermissionDto,
  PermissionResponseDto,
} from './dto';
import { Tenant } from '../../common/decorators';
import type { TenantContext } from '../../common/decorators';
import { TenantGuard, RequireOrganization } from '../../common/guards';

@ApiTags('Pipeline Permissions')
@Controller()
@UseGuards(TenantGuard)
@RequireOrganization()
@ApiHeader({ name: 'X-Tenant-Id', required: true })
@ApiHeader({ name: 'X-Organization-Id', required: true })
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
    @Tenant() ctx: TenantContext,
  ): Promise<PermissionResponseDto[]> {
    return this.permissionsService.getPermissions(
      ctx.tenantId,
      ctx.orgId!,
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
    @Tenant() ctx: TenantContext,
  ): Promise<PermissionResponseDto> {
    return this.permissionsService.assignPermission(
      ctx.tenantId,
      ctx.orgId!,
      pipelineId,
      dto,
      ctx.userId,
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
    @Tenant() ctx: TenantContext,
  ): Promise<PermissionResponseDto> {
    return this.permissionsService.updatePermission(
      ctx.tenantId,
      ctx.orgId!,
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
    @Tenant() ctx: TenantContext,
  ): Promise<void> {
    return this.permissionsService.removePermission(
      ctx.tenantId,
      ctx.orgId!,
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
    @Tenant() ctx: TenantContext,
  ) {
    if (!ctx.userId) {
      return { hasAccess: false, permission: null };
    }

    const permission = await this.permissionsService.getUserPermission(
      ctx.tenantId,
      ctx.orgId!,
      pipelineId,
      ctx.userId,
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
    @Tenant() ctx: TenantContext,
  ) {
    return this.permissionsService.getAvailableGroups(
      ctx.tenantId,
      ctx.orgId!,
      pipelineId,
    );
  }

  // ==================== Published Pipelines Endpoints ====================

  @Get('published-pipelines')
  @ApiOperation({ summary: 'Listar pipelines publicados que o usuário tem acesso' })
  @ApiResponse({ status: 200, description: 'Lista de pipelines' })
  async getAccessiblePipelines(
    @Tenant() ctx: TenantContext,
  ) {
    if (!ctx.userId) {
      return [];
    }

    return this.permissionsService.getAccessiblePipelines(
      ctx.tenantId,
      ctx.orgId!,
      ctx.userId,
    );
  }

  @Get('published-pipelines/by-project')
  @ApiOperation({ summary: 'Listar pipelines publicados agrupados por projeto' })
  @ApiResponse({ status: 200, description: 'Pipelines agrupados por projeto' })
  async getAccessiblePipelinesByProject(
    @Tenant() ctx: TenantContext,
  ) {
    if (!ctx.userId) {
      return {};
    }

    return this.permissionsService.getAccessiblePipelinesByProject(
      ctx.tenantId,
      ctx.orgId!,
      ctx.userId,
    );
  }
}
