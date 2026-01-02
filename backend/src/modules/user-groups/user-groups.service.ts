import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { TenantContext } from '../../common/decorators';
import { CreateGroupDto, UpdateGroupDto, AddMembersDto } from './dto';

@Injectable()
export class UserGroupsService {
  constructor(private prisma: PrismaService) {}

  async create(ctx: TenantContext, dto: CreateGroupDto, userId?: string) {
    // Check if group name already exists in org
    const existing = await this.prisma.userGroup.findFirst({
      where: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId!,
        name: dto.name,
      },
    });

    if (existing) {
      throw new ConflictException(`Group with name "${dto.name}" already exists`);
    }

    return this.prisma.userGroup.create({
      data: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId!,
        name: dto.name,
        description: dto.description,
        createdBy: userId,
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, email: true, name: true },
            },
          },
        },
        _count: {
          select: { members: true, permissions: true },
        },
      },
    });
  }

  async findAll(ctx: TenantContext) {
    const groups = await this.prisma.userGroup.findMany({
      where: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId!,
      },
      include: {
        _count: {
          select: { members: true, permissions: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return { items: groups };
  }

  async findOne(ctx: TenantContext, groupId: string) {
    const group = await this.prisma.userGroup.findFirst({
      where: {
        id: groupId,
        tenantId: ctx.tenantId,
        orgId: ctx.orgId!,
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, email: true, name: true },
            },
          },
          orderBy: { addedAt: 'desc' },
        },
        permissions: {
          include: {
            pipeline: {
              select: { id: true, key: true, name: true, projectName: true },
            },
          },
        },
        _count: {
          select: { members: true, permissions: true },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Group not found`);
    }

    return group;
  }

  async update(ctx: TenantContext, groupId: string, dto: UpdateGroupDto) {
    // Check if group exists
    const group = await this.prisma.userGroup.findFirst({
      where: {
        id: groupId,
        tenantId: ctx.tenantId,
        orgId: ctx.orgId!,
      },
    });

    if (!group) {
      throw new NotFoundException(`Group not found`);
    }

    // Check if new name conflicts
    if (dto.name && dto.name !== group.name) {
      const existing = await this.prisma.userGroup.findFirst({
        where: {
          tenantId: ctx.tenantId,
          orgId: ctx.orgId!,
          name: dto.name,
          id: { not: groupId },
        },
      });

      if (existing) {
        throw new ConflictException(`Group with name "${dto.name}" already exists`);
      }
    }

    return this.prisma.userGroup.update({
      where: { id: groupId },
      data: {
        name: dto.name,
        description: dto.description,
      },
      include: {
        _count: {
          select: { members: true, permissions: true },
        },
      },
    });
  }

  async delete(ctx: TenantContext, groupId: string) {
    const group = await this.prisma.userGroup.findFirst({
      where: {
        id: groupId,
        tenantId: ctx.tenantId,
        orgId: ctx.orgId!,
      },
    });

    if (!group) {
      throw new NotFoundException(`Group not found`);
    }

    await this.prisma.userGroup.delete({
      where: { id: groupId },
    });

    return { deleted: true, id: groupId };
  }

  // Member management
  async addMembers(ctx: TenantContext, groupId: string, dto: AddMembersDto, addedBy?: string) {
    // Check if group exists
    const group = await this.prisma.userGroup.findFirst({
      where: {
        id: groupId,
        tenantId: ctx.tenantId,
        orgId: ctx.orgId!,
      },
    });

    if (!group) {
      throw new NotFoundException(`Group not found`);
    }

    // Verify users exist and belong to same tenant
    const users = await this.prisma.user.findMany({
      where: {
        id: { in: dto.userIds },
        tenantId: ctx.tenantId,
      },
    });

    if (users.length !== dto.userIds.length) {
      throw new NotFoundException('One or more users not found');
    }

    // Add members (skip if already exists)
    const results = await Promise.all(
      dto.userIds.map(async (userId) => {
        try {
          return await this.prisma.groupMember.create({
            data: {
              groupId,
              userId,
              addedBy,
            },
            include: {
              user: {
                select: { id: true, email: true, name: true },
              },
            },
          });
        } catch (error: any) {
          // Ignore unique constraint violations (member already exists)
          if (error.code === 'P2002') {
            return null;
          }
          throw error;
        }
      }),
    );

    return {
      added: results.filter(Boolean).length,
      members: results.filter(Boolean),
    };
  }

  async removeMember(ctx: TenantContext, groupId: string, userId: string) {
    // Check if group exists
    const group = await this.prisma.userGroup.findFirst({
      where: {
        id: groupId,
        tenantId: ctx.tenantId,
        orgId: ctx.orgId!,
      },
    });

    if (!group) {
      throw new NotFoundException(`Group not found`);
    }

    const member = await this.prisma.groupMember.findFirst({
      where: {
        groupId,
        userId,
      },
    });

    if (!member) {
      throw new NotFoundException('Member not found in group');
    }

    await this.prisma.groupMember.delete({
      where: { id: member.id },
    });

    return { removed: true, userId };
  }

  async getMembers(ctx: TenantContext, groupId: string) {
    const group = await this.prisma.userGroup.findFirst({
      where: {
        id: groupId,
        tenantId: ctx.tenantId,
        orgId: ctx.orgId!,
      },
    });

    if (!group) {
      throw new NotFoundException(`Group not found`);
    }

    const members = await this.prisma.groupMember.findMany({
      where: { groupId },
      include: {
        user: {
          select: { id: true, email: true, name: true },
        },
      },
      orderBy: { addedAt: 'desc' },
    });

    return { items: members };
  }

  // Get groups for a specific user
  async getUserGroups(ctx: TenantContext, userId: string) {
    const groups = await this.prisma.userGroup.findMany({
      where: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId!,
        members: {
          some: { userId },
        },
      },
      include: {
        _count: {
          select: { members: true, permissions: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return { items: groups };
  }

  // Get available users (not in group yet)
  async getAvailableUsers(ctx: TenantContext, groupId: string) {
    const group = await this.prisma.userGroup.findFirst({
      where: {
        id: groupId,
        tenantId: ctx.tenantId,
        orgId: ctx.orgId!,
      },
    });

    if (!group) {
      throw new NotFoundException(`Group not found`);
    }

    const users = await this.prisma.user.findMany({
      where: {
        tenantId: ctx.tenantId,
        groupMemberships: {
          none: { groupId },
        },
      },
      select: { id: true, email: true, name: true },
      orderBy: { name: 'asc' },
    });

    return { items: users };
  }
}
