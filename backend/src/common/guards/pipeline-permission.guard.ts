import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PipelineRole } from '@prisma/client';
import { PipelinePermissionsService } from '../../modules/pipeline-permissions';

export const PIPELINE_PERMISSION_KEY = 'pipelinePermission';

/**
 * Decorator to require specific pipeline permission
 * @param role - Minimum required role (VIEWER, OPERATOR, SUPERVISOR, ADMIN)
 * @param pipelineIdParam - Name of the route parameter containing the pipeline ID (default: 'pipelineId')
 */
export const RequirePipelinePermission = (
  role: PipelineRole,
  pipelineIdParam: string = 'pipelineId',
) => SetMetadata(PIPELINE_PERMISSION_KEY, { role, pipelineIdParam });

@Injectable()
export class PipelinePermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private permissionsService: PipelinePermissionsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissionConfig = this.reflector.getAllAndOverride<{
      role: PipelineRole;
      pipelineIdParam: string;
    }>(PIPELINE_PERMISSION_KEY, [context.getHandler(), context.getClass()]);

    // If no permission decorator, allow access
    if (!permissionConfig) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    const tenantId = request.headers['x-tenant-id'];
    const orgId = request.headers['x-organization-id'];

    if (!tenantId || !orgId) {
      throw new ForbiddenException('Contexto do tenant não encontrado');
    }

    // Get pipeline ID from route params
    const pipelineId = request.params[permissionConfig.pipelineIdParam];

    if (!pipelineId) {
      throw new ForbiddenException('Pipeline ID não encontrado na requisição');
    }

    // Check user permission
    const hasPermission = await this.permissionsService.checkPermission(
      tenantId,
      orgId,
      pipelineId,
      user.id,
      permissionConfig.role,
    );

    if (!hasPermission) {
      throw new ForbiddenException(
        `Você não tem permissão de ${this.getRoleLabel(permissionConfig.role)} neste pipeline`,
      );
    }

    return true;
  }

  private getRoleLabel(role: PipelineRole): string {
    const labels: Record<PipelineRole, string> = {
      VIEWER: 'visualizador',
      OPERATOR: 'operador',
      SUPERVISOR: 'supervisor',
      ADMIN: 'administrador',
    };
    return labels[role] || role;
  }
}
