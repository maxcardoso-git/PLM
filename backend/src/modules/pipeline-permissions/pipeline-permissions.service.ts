import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma';
import { PipelineRole } from '@prisma/client';
import {
  AssignPermissionDto,
  UpdatePermissionDto,
  PermissionResponseDto,
  UserPermissionDto,
} from './dto';

// Role hierarchy for permission comparison
const ROLE_HIERARCHY: Record<PipelineRole, number> = {
  VIEWER: 1,
  OPERATOR: 2,
  SUPERVISOR: 3,
  ADMIN: 4,
};

@Injectable()
export class PipelinePermissionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assign permission to a group for a pipeline
   */
  async assignPermission(
    tenantId: string,
    orgId: string,
    pipelineId: string,
    dto: AssignPermissionDto,
    createdBy?: string,
  ): Promise<PermissionResponseDto> {
    // Verify pipeline exists and belongs to tenant
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: pipelineId, tenantId, orgId },
    });

    if (!pipeline) {
      throw new NotFoundException('Pipeline não encontrado');
    }

    // Verify group exists and belongs to tenant
    const group = await this.prisma.userGroup.findFirst({
      where: { id: dto.groupId, tenantId, orgId },
    });

    if (!group) {
      throw new NotFoundException('Grupo não encontrado');
    }

    // Check if permission already exists
    const existing = await this.prisma.pipelinePermission.findUnique({
      where: {
        uq_pipeline_permission: {
          pipelineId,
          groupId: dto.groupId,
        },
      },
    });

    if (existing) {
      throw new ConflictException('Este grupo já possui permissão neste pipeline');
    }

    const permission = await this.prisma.pipelinePermission.create({
      data: {
        pipelineId,
        groupId: dto.groupId,
        role: dto.role,
        createdBy,
      },
      include: {
        group: {
          select: { id: true, name: true, description: true },
        },
      },
    });

    return permission;
  }

  /**
   * Get all permissions for a pipeline
   */
  async getPermissions(
    tenantId: string,
    orgId: string,
    pipelineId: string,
  ): Promise<PermissionResponseDto[]> {
    // Verify pipeline exists
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: pipelineId, tenantId, orgId },
    });

    if (!pipeline) {
      throw new NotFoundException('Pipeline não encontrado');
    }

    return this.prisma.pipelinePermission.findMany({
      where: { pipelineId },
      include: {
        group: {
          select: { id: true, name: true, description: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Update a permission
   */
  async updatePermission(
    tenantId: string,
    orgId: string,
    pipelineId: string,
    permissionId: string,
    dto: UpdatePermissionDto,
  ): Promise<PermissionResponseDto> {
    // Verify pipeline exists
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: pipelineId, tenantId, orgId },
    });

    if (!pipeline) {
      throw new NotFoundException('Pipeline não encontrado');
    }

    const permission = await this.prisma.pipelinePermission.findFirst({
      where: { id: permissionId, pipelineId },
    });

    if (!permission) {
      throw new NotFoundException('Permissão não encontrada');
    }

    return this.prisma.pipelinePermission.update({
      where: { id: permissionId },
      data: { role: dto.role },
      include: {
        group: {
          select: { id: true, name: true, description: true },
        },
      },
    });
  }

  /**
   * Remove a permission
   */
  async removePermission(
    tenantId: string,
    orgId: string,
    pipelineId: string,
    permissionId: string,
  ): Promise<void> {
    // Verify pipeline exists
    const pipeline = await this.prisma.pipeline.findFirst({
      where: { id: pipelineId, tenantId, orgId },
    });

    if (!pipeline) {
      throw new NotFoundException('Pipeline não encontrado');
    }

    const permission = await this.prisma.pipelinePermission.findFirst({
      where: { id: permissionId, pipelineId },
    });

    if (!permission) {
      throw new NotFoundException('Permissão não encontrada');
    }

    await this.prisma.pipelinePermission.delete({
      where: { id: permissionId },
    });
  }

  /**
   * Get user's permission for a specific pipeline
   */
  async getUserPermission(
    tenantId: string,
    orgId: string,
    pipelineId: string,
    userId: string,
  ): Promise<UserPermissionDto | null> {
    // Get all groups the user belongs to
    const userGroups = await this.prisma.groupMember.findMany({
      where: {
        userId,
        group: { tenantId, orgId },
      },
      select: { groupId: true },
    });

    if (userGroups.length === 0) {
      return null;
    }

    const groupIds = userGroups.map((ug) => ug.groupId);

    // Get permissions for these groups on the pipeline
    const permissions = await this.prisma.pipelinePermission.findMany({
      where: {
        pipelineId,
        groupId: { in: groupIds },
      },
      include: {
        group: { select: { name: true } },
      },
    });

    if (permissions.length === 0) {
      return null;
    }

    // Return the highest permission level
    const highestPermission = permissions.reduce((highest, current) => {
      if (ROLE_HIERARCHY[current.role] > ROLE_HIERARCHY[highest.role]) {
        return current;
      }
      return highest;
    });

    return {
      pipelineId,
      role: highestPermission.role,
      groupId: highestPermission.groupId,
      groupName: highestPermission.group.name,
    };
  }

  /**
   * Check if user has required permission level
   */
  async checkPermission(
    tenantId: string,
    orgId: string,
    pipelineId: string,
    userId: string,
    requiredRole: PipelineRole,
  ): Promise<boolean> {
    const userPermission = await this.getUserPermission(
      tenantId,
      orgId,
      pipelineId,
      userId,
    );

    if (!userPermission) {
      return false;
    }

    return ROLE_HIERARCHY[userPermission.role] >= ROLE_HIERARCHY[requiredRole];
  }

  /**
   * Get all published pipelines the user has access to
   */
  async getAccessiblePipelines(
    tenantId: string,
    orgId: string,
    userId: string,
  ): Promise<any[]> {
    console.log('[getAccessiblePipelines] ========================================');
    console.log('[getAccessiblePipelines] Input params:');
    console.log('[getAccessiblePipelines]   tenantId:', tenantId);
    console.log('[getAccessiblePipelines]   orgId:', orgId, '(type:', typeof orgId, ')');
    console.log('[getAccessiblePipelines]   userId:', userId);

    // Debug: Check what groups exist for this user (without org filter first)
    const allUserGroupsNoOrgFilter = await this.prisma.groupMember.findMany({
      where: { userId },
      include: { group: { select: { id: true, name: true, tenantId: true, orgId: true } } },
    });
    console.log('[getAccessiblePipelines] User groups WITHOUT org filter:',
      allUserGroupsNoOrgFilter.map(g => ({
        groupId: g.groupId,
        groupName: g.group.name,
        groupTenantId: g.group.tenantId,
        groupOrgId: g.group.orgId,
      }))
    );

    // Get all groups the user belongs to
    const userGroups = await this.prisma.groupMember.findMany({
      where: {
        userId,
        group: { tenantId, orgId },
      },
      select: { groupId: true },
    });

    console.log('[getAccessiblePipelines] userGroups WITH org filter:', userGroups.length, userGroups);

    if (userGroups.length === 0) {
      return [];
    }

    const groupIds = userGroups.map((ug) => ug.groupId);
    console.log('[getAccessiblePipelines] groupIds:', groupIds);

    // Get all permissions for user's groups
    const permissions = await this.prisma.pipelinePermission.findMany({
      where: {
        groupId: { in: groupIds },
        pipeline: {
          tenantId,
          orgId,
          // Only published pipelines
          versions: {
            some: {
              status: 'published',
            },
          },
        },
      },
      include: {
        pipeline: {
          select: {
            id: true,
            name: true,
            projectName: true,
            description: true,
            createdAt: true,
            versions: {
              where: { status: 'published' },
              orderBy: { publishedAt: 'desc' },
              take: 1,
              select: {
                id: true,
                version: true,
                publishedAt: true,
              },
            },
          },
        },
        group: {
          select: { name: true },
        },
      },
    });

    console.log('[getAccessiblePipelines] permissions found:', permissions.length, permissions.map(p => ({ pipelineId: p.pipelineId, role: p.role })));

    // Group by pipeline and get highest role
    const pipelineMap = new Map<string, any>();

    for (const perm of permissions) {
      const existing = pipelineMap.get(perm.pipelineId);

      if (!existing || ROLE_HIERARCHY[perm.role] > ROLE_HIERARCHY[existing.role]) {
        pipelineMap.set(perm.pipelineId, {
          ...perm.pipeline,
          role: perm.role,
          groupName: perm.group.name,
          publishedVersion: perm.pipeline.versions[0] || null,
        });
      }
    }

    // Convert to array and group by project
    const pipelines = Array.from(pipelineMap.values());

    return pipelines.sort((a, b) => {
      // Sort by project name, then by pipeline name
      const projectCompare = (a.projectName || '').localeCompare(b.projectName || '');
      if (projectCompare !== 0) return projectCompare;
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Get accessible pipelines grouped by project
   */
  async getAccessiblePipelinesByProject(
    tenantId: string,
    orgId: string,
    userId: string,
  ): Promise<Record<string, any[]>> {
    const pipelines = await this.getAccessiblePipelines(tenantId, orgId, userId);

    const grouped: Record<string, any[]> = {};

    for (const pipeline of pipelines) {
      const projectName = pipeline.projectName || 'Sem Projeto';
      if (!grouped[projectName]) {
        grouped[projectName] = [];
      }
      grouped[projectName].push(pipeline);
    }

    return grouped;
  }

  /**
   * Get groups without permission on a pipeline (for assignment UI)
   */
  async getAvailableGroups(
    tenantId: string,
    orgId: string,
    pipelineId: string,
  ): Promise<any[]> {
    // Get groups that already have permission
    const existingPermissions = await this.prisma.pipelinePermission.findMany({
      where: { pipelineId },
      select: { groupId: true },
    });

    const assignedGroupIds = existingPermissions.map((p) => p.groupId);

    // Get groups not yet assigned
    return this.prisma.userGroup.findMany({
      where: {
        tenantId,
        orgId,
        id: { notIn: assignedGroupIds },
      },
      select: {
        id: true,
        name: true,
        description: true,
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    });
  }
}
