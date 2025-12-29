import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateOrganizationDto } from './dto';

@Injectable()
export class OrganizationsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateOrganizationDto) {
    return this.prisma.organization.create({
      data: {
        tenantId,
        code: dto.code,
        name: dto.name,
        status: dto.status || 'active',
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.organization.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    const organization = await this.prisma.organization.findFirst({
      where: { id, tenantId },
      include: {
        pipelines: {
          select: {
            id: true,
            key: true,
            name: true,
            lifecycleStatus: true,
          },
        },
      },
    });

    if (!organization) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    return organization;
  }

  async update(tenantId: string, id: string, dto: Partial<CreateOrganizationDto>) {
    await this.findOne(tenantId, id);
    return this.prisma.organization.update({
      where: { id },
      data: dto,
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    return this.prisma.organization.delete({
      where: { id },
    });
  }
}
