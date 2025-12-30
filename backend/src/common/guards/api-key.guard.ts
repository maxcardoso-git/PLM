import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  ForbiddenException,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlmApiKeysService } from '../../modules/plm-api-keys/plm-api-keys.service';
import { ApiKeyPermission } from '../../modules/plm-api-keys/dto';

export const API_KEY_PERMISSIONS_KEY = 'apiKeyPermissions';

/**
 * Decorator to specify required permissions for an endpoint
 * @param permissions - Array of required permissions
 */
export const RequireApiKeyPermissions = (...permissions: ApiKeyPermission[]) =>
  SetMetadata(API_KEY_PERMISSIONS_KEY, permissions);

/**
 * Guard for authenticating external API requests via X-API-Key header
 * Validates the API key and checks if it has the required permissions
 */
@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly plmApiKeysService: PlmApiKeysService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = request.headers['x-api-key'];

    if (!apiKey) {
      throw new UnauthorizedException('X-API-Key header is required');
    }

    // Validate the API key
    const keyData = await this.plmApiKeysService.validateKey(apiKey);

    if (!keyData) {
      throw new UnauthorizedException('Invalid or disabled API key');
    }

    // Check if key has expired
    if (keyData.expiresAt && new Date(keyData.expiresAt) < new Date()) {
      throw new UnauthorizedException('API key has expired');
    }

    // Get required permissions for this endpoint
    const requiredPermissions = this.reflector.getAllAndOverride<ApiKeyPermission[]>(
      API_KEY_PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Check permissions if any are required
    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAllPermissions = requiredPermissions.every((permission) =>
        keyData.permissions.includes(permission),
      );

      if (!hasAllPermissions) {
        throw new ForbiddenException(
          `Missing required permissions: ${requiredPermissions.filter(
            (p) => !keyData.permissions.includes(p),
          ).join(', ')}`,
        );
      }
    }

    // Inject tenant and org info into request for downstream use
    request.apiKeyAuth = {
      tenantId: keyData.tenantId,
      orgId: keyData.orgId,
      keyId: keyData.id,
      keyName: keyData.name,
      permissions: keyData.permissions,
    };

    // Also set the standard headers for compatibility with existing code
    request.headers['x-tenant-id'] = keyData.tenantId;
    request.headers['x-organization-id'] = keyData.orgId;

    return true;
  }
}
