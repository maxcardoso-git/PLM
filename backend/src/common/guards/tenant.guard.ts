import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';

export const REQUIRE_ORG_KEY = 'requireOrganization';
export const RequireOrganization = () => Reflect.metadata(REQUIRE_ORG_KEY, true);

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'];
    let organizationId = request.headers['x-organization-id'];

    if (!tenantId) {
      throw new BadRequestException('X-Tenant-Id header is required');
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(tenantId)) {
      throw new BadRequestException('X-Tenant-Id must be a valid UUID');
    }

    const requireOrg = this.reflector.getAllAndOverride<boolean>(REQUIRE_ORG_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (requireOrg && !organizationId) {
      throw new BadRequestException('X-Organization-Id header is required');
    }

    // If organizationId is provided but not a UUID, look it up by code
    if (organizationId && !uuidRegex.test(organizationId)) {
      const org = await this.prisma.organization.findFirst({
        where: {
          tenantId,
          code: organizationId,
        },
      });

      if (!org) {
        throw new NotFoundException(`Organization with code '${organizationId}' not found`);
      }

      // Replace the code with the actual UUID for downstream use
      request.headers['x-organization-id'] = org.id;
      request.organizationId = org.id;
    }

    return true;
  }
}
