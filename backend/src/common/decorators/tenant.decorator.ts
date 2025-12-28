import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface TenantContext {
  tenantId: string;
  organizationId?: string;
}

export const Tenant = createParamDecorator(
  (data: keyof TenantContext | undefined, ctx: ExecutionContext): TenantContext | string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    const tenantContext: TenantContext = {
      tenantId: request.headers['x-tenant-id'],
      organizationId: request.headers['x-organization-id'],
    };

    return data ? tenantContext[data] : tenantContext;
  },
);

export const TenantId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['x-tenant-id'];
  },
);

export const OrganizationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.headers['x-organization-id'];
  },
);
