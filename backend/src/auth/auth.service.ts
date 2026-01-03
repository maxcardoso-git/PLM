import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import jwksRsa from 'jwks-rsa';
import * as jwt from 'jsonwebtoken';
import { PrismaService } from '../prisma/prisma.service';
import type { TahJwtPayload, AuthenticatedUser } from './dto/tah-callback.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly jwksClient: jwksRsa.JwksClient;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {
    const jwksUri = this.configService.get<string>('TAH_JWKS_URL');
    if (jwksUri) {
      this.jwksClient = jwksRsa({
        jwksUri,
        cache: true,
        cacheMaxAge: 600000, // 10 minutes
        rateLimit: true,
        jwksRequestsPerMinute: 10,
      });
    }
  }

  async validateTahToken(token: string): Promise<TahJwtPayload> {
    try {
      // Decode the token to get the kid (key id)
      const decoded = jwt.decode(token, { complete: true });
      if (!decoded || typeof decoded === 'string') {
        throw new UnauthorizedException('Invalid token format');
      }

      const kid = decoded.header.kid;
      if (!kid) {
        throw new UnauthorizedException('Token missing key ID');
      }

      // Get the signing key from JWKS
      const key = await this.getSigningKey(kid);

      // Verify the token
      const payload = jwt.verify(token, key, {
        algorithms: ['RS256'],
        issuer: this.configService.get<string>('TAH_ISSUER', 'http://72.61.52.70:3050'),
        audience: this.configService.get<string>('APP_ID', 'p_l_m'),
      }) as TahJwtPayload;

      return payload;
    } catch (error) {
      this.logger.error('Token validation failed', error);
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Token expired');
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token');
      }
      throw new UnauthorizedException('Token validation failed');
    }
  }

  private async getSigningKey(kid: string): Promise<string> {
    try {
      const key = await this.jwksClient.getSigningKey(kid);
      return key.getPublicKey();
    } catch (error) {
      this.logger.error('Failed to get signing key', error);
      throw new UnauthorizedException('Unable to verify token signature');
    }
  }

  async findOrCreateUser(payload: TahJwtPayload): Promise<AuthenticatedUser> {
    const { sub: tahUserId, email, name, tenant_id, org_id, roles } = payload;

    // TAH sometimes sends org_id equal to tenant_id or doesn't send it at all
    // In these cases, default to 'org-1' which is the standard organization
    const effectiveOrgId = (org_id && org_id !== tenant_id) ? org_id : 'org-1';
    this.logger.debug(`TAH org_id: ${org_id}, effective orgId: ${effectiveOrgId}`);

    // First, ensure the tenant exists
    let tenant = await this.prisma.tenant.findUnique({
      where: { id: tenant_id },
    });

    if (!tenant) {
      // Create the tenant (JIT provisioning)
      tenant = await this.prisma.tenant.create({
        data: {
          id: tenant_id,
          name: `Tenant ${tenant_id.substring(0, 8)}`,
          status: 'active',
        },
      });
      this.logger.log(`JIT provisioned tenant: ${tenant.id}`);
    }

    // Find or create the user
    let user = await this.prisma.user.findUnique({
      where: { tahUserId },
    });

    if (user) {
      // Update existing user
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: {
          email,
          name,
          orgId: effectiveOrgId,
          roles: roles || [],
          lastLoginAt: new Date(),
        },
      });
    } else {
      // Create new user (JIT provisioning)
      user = await this.prisma.user.create({
        data: {
          tahUserId,
          email,
          name,
          tenantId: tenant_id,
          orgId: effectiveOrgId,
          roles: roles || [],
          lastLoginAt: new Date(),
        },
      });
      this.logger.log(`JIT provisioned user: ${user.id}`);
    }

    return {
      id: user.id,
      tahUserId: user.tahUserId,
      email: user.email,
      name: user.name ?? undefined,
      tenantId: user.tenantId,
      orgId: user.orgId ?? undefined,
      roles: user.roles,
    };
  }

  createSessionToken(user: AuthenticatedUser): string {
    return this.jwtService.sign({
      sub: user.id,
      tahUserId: user.tahUserId,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      orgId: user.orgId,
      roles: user.roles,
    });
  }

  async validateSessionToken(token: string): Promise<AuthenticatedUser | null> {
    try {
      const payload = this.jwtService.verify(token);

      // Verify user still exists
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        tahUserId: user.tahUserId,
        email: user.email,
        name: user.name ?? undefined,
        tenantId: user.tenantId,
        orgId: user.orgId ?? undefined,
        roles: user.roles,
      };
    } catch {
      return null;
    }
  }

  getTahLoginUrl(): string {
    const tahBaseUrl = this.configService.get<string>('TAH_BASE_URL', 'http://72.61.52.70:3050');
    const appId = this.configService.get<string>('APP_ID', 'plm');
    const backendUrl = this.configService.get<string>('BACKEND_URL', 'http://localhost:3000');
    const callbackUrl = `${backendUrl}/api/v1/auth/tah-callback`;

    return `${tahBaseUrl}/api/v1/auth/app-launcher?app_id=${appId}&callback_url=${encodeURIComponent(callbackUrl)}`;
  }
}
