import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateAutomationBindingDto, UpdateAutomationBindingDto } from './dto';
import { TenantContext } from '../../common/decorators';

@Injectable()
export class AutomationsService {
  constructor(private prisma: PrismaService) {}

  async create(ctx: TenantContext, dto: CreateAutomationBindingDto) {
    const pipeline = await this.prisma.pipeline.findFirst({
      where: {
        id: dto.pipelineId,
        tenantId: ctx.tenantId,
        orgId: ctx.orgId!,
      },
    });

    if (!pipeline) {
      throw new NotFoundException('Pipeline not found');
    }

    return this.prisma.automationBinding.create({
      data: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId!,
        pipelineId: dto.pipelineId,
        eventType: dto.eventType,
        filterFromStageId: dto.filterFromStageId,
        filterToStageId: dto.filterToStageId,
        automationPlanId: dto.automationPlanId,
        enabled: dto.enabled ?? true,
      },
      include: {
        pipeline: { select: { id: true, name: true } },
        filterFromStage: { select: { id: true, name: true } },
        filterToStage: { select: { id: true, name: true } },
      },
    });
  }

  async findAll(ctx: TenantContext, pipelineId?: string, eventType?: string) {
    return this.prisma.automationBinding.findMany({
      where: {
        tenantId: ctx.tenantId,
        orgId: ctx.orgId!,
        ...(pipelineId && { pipelineId }),
        ...(eventType && { eventType: eventType as any }),
      },
      include: {
        pipeline: { select: { id: true, name: true } },
        filterFromStage: { select: { id: true, name: true } },
        filterToStage: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(ctx: TenantContext, id: string) {
    const binding = await this.prisma.automationBinding.findFirst({
      where: {
        id,
        tenantId: ctx.tenantId,
        orgId: ctx.orgId!,
      },
      include: {
        pipeline: { select: { id: true, name: true } },
        filterFromStage: { select: { id: true, name: true } },
        filterToStage: { select: { id: true, name: true } },
      },
    });

    if (!binding) {
      throw new NotFoundException(`Automation binding ${id} not found`);
    }

    return binding;
  }

  async update(ctx: TenantContext, id: string, dto: UpdateAutomationBindingDto) {
    await this.findOne(ctx, id);

    return this.prisma.automationBinding.update({
      where: { id },
      data: dto,
      include: {
        pipeline: { select: { id: true, name: true } },
        filterFromStage: { select: { id: true, name: true } },
        filterToStage: { select: { id: true, name: true } },
      },
    });
  }

  async delete(ctx: TenantContext, id: string) {
    await this.findOne(ctx, id);
    return this.prisma.automationBinding.delete({ where: { id } });
  }

  async toggle(ctx: TenantContext, id: string, enabled: boolean) {
    await this.findOne(ctx, id);
    return this.prisma.automationBinding.update({
      where: { id },
      data: { enabled },
    });
  }
}
