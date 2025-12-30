import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { AuthenticatedUser } from '../dto/tah-callback.dto';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly configService: ConfigService,
    private readonly authService: AuthService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        // Extract from cookie first
        (request: Request) => {
          const sessionCookie = request?.cookies?.['plm_session'];
          return sessionCookie || null;
        },
        // Fallback to Authorization header
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET', 'plm-session-secret'),
    });
  }

  async validate(payload: {
    sub: string;
    tahUserId: string;
    email: string;
    name?: string;
    tenantId: string;
    orgId?: string;
    roles: string[];
  }): Promise<AuthenticatedUser> {
    const user: AuthenticatedUser = {
      id: payload.sub,
      tahUserId: payload.tahUserId,
      email: payload.email,
      name: payload.name,
      tenantId: payload.tenantId,
      orgId: payload.orgId,
      roles: payload.roles,
    };

    if (!user.id) {
      throw new UnauthorizedException('Invalid session');
    }

    return user;
  }
}
