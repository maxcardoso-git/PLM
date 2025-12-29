import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

export const REQUIRE_ORG_KEY = 'requireOrganization';
export const RequireOrganization = () => Reflect.metadata(REQUIRE_ORG_KEY, true);

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'];
    const orgId = request.headers['x-organization-id'];

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

    if (requireOrg && !orgId) {
      throw new BadRequestException('X-Organization-Id header is required');
    }

    // orgId is now a simple string, no UUID validation needed
    // Store it in request for easy access
    request.orgId = orgId;

    return true;
  }
}
