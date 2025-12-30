import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { CurrentUser } from './decorators/current-user.decorator';
import type { Request, Response } from 'express';
import type { TahCallbackDto, AuthenticatedUser } from './dto/tah-callback.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Get('login')
  @Public()
  @ApiOperation({ summary: 'Redirect to TAH login' })
  @ApiResponse({ status: 302, description: 'Redirects to TAH login page' })
  login(@Res() res: Response) {
    const loginUrl = this.authService.getTahLoginUrl();
    this.logger.log(`Redirecting to TAH login: ${loginUrl}`);
    return res.redirect(loginUrl);
  }

  @Get('tah-callback')
  @Public()
  @ApiOperation({ summary: 'TAH authentication callback' })
  @ApiQuery({ name: 'token', required: true, description: 'JWT token from TAH' })
  @ApiResponse({ status: 302, description: 'Redirects to frontend after successful authentication' })
  @ApiResponse({ status: 401, description: 'Invalid or expired token' })
  async tahCallback(
    @Query() query: TahCallbackDto,
    @Res() res: Response,
  ) {
    try {
      const { token } = query;

      // Validate the TAH token using JWKS
      const tahPayload = await this.authService.validateTahToken(token);
      this.logger.log(`TAH token validated for user: ${tahPayload.email}`);

      // Find or create user (JIT provisioning)
      const user = await this.authService.findOrCreateUser(tahPayload);
      this.logger.log(`User authenticated: ${user.email}`);

      // Create session token
      const sessionToken = this.authService.createSessionToken(user);

      // Set session cookie
      const cookieDomain = this.configService.get<string>('COOKIE_DOMAIN');
      const isProduction = this.configService.get<string>('NODE_ENV') === 'production';

      res.cookie('plm_session', sessionToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: 'lax',
        domain: cookieDomain || undefined,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
      });

      // Also set a non-httpOnly cookie for frontend to detect auth state
      res.cookie('plm_auth', JSON.stringify({
        userId: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        orgId: user.orgId,
      }), {
        httpOnly: false,
        secure: isProduction,
        sameSite: 'lax',
        domain: cookieDomain || undefined,
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
        path: '/',
      });

      // Redirect to frontend
      const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
      return res.redirect(`${frontendUrl}?auth=success`);
    } catch (error) {
      this.logger.error('TAH callback failed', error);
      const frontendUrl = this.configService.get<string>('FRONTEND_URL', 'http://localhost:5173');
      return res.redirect(`${frontendUrl}?auth=error&message=${encodeURIComponent(error.message)}`);
    }
  }

  @Post('logout')
  @Public()
  @ApiOperation({ summary: 'Logout and clear session' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  logout(@Res() res: Response) {
    const cookieDomain = this.configService.get<string>('COOKIE_DOMAIN');

    res.clearCookie('plm_session', {
      domain: cookieDomain || undefined,
      path: '/',
    });
    res.clearCookie('plm_auth', {
      domain: cookieDomain || undefined,
      path: '/',
    });

    return res.json({ success: true, message: 'Logged out successfully' });
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user' })
  @ApiResponse({ status: 200, description: 'Returns current user info' })
  @ApiResponse({ status: 401, description: 'Not authenticated' })
  getMe(@CurrentUser() user: AuthenticatedUser) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      tenantId: user.tenantId,
      orgId: user.orgId,
      roles: user.roles,
    };
  }

  @Get('status')
  @Public()
  @ApiOperation({ summary: 'Check authentication status' })
  @ApiResponse({ status: 200, description: 'Returns authentication status' })
  async getStatus(@Req() req: Request) {
    const sessionCookie = req.cookies?.['plm_session'];

    if (!sessionCookie) {
      return { authenticated: false };
    }

    const user = await this.authService.validateSessionToken(sessionCookie);
    if (!user) {
      return { authenticated: false };
    }

    return {
      authenticated: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        tenantId: user.tenantId,
        orgId: user.orgId,
        roles: user.roles,
      },
    };
  }
}
