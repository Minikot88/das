import { Body, Controller, HttpCode, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { RuntimeEnvironment } from '../../../app/config/environment.js';
import { Inject } from '@nestjs/common';
import { ENVIRONMENT } from '../../../app/config/token.js';
import { ensureRequestId } from '../../../shared/http/request-id.js';
import { AuthService } from '../application/auth.service.js';
import { MembershipService } from '../application/membership.service.js';
import { AuthRateLimitGuard } from '../application/auth-rate-limit.guard.js';

@Controller('api/auth')
export class LegacyAuthController {
  constructor(private readonly auth: AuthService, private readonly memberships: MembershipService, @Inject(ENVIRONMENT) private readonly environment: RuntimeEnvironment) {}

  @UseGuards(AuthRateLimitGuard) @Post('login') @HttpCode(200)
  async login(@Body() body: { email?: string; password?: string }, @Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.auth.login(String(body.email || ''), String(body.password || ''), {
      requestId: ensureRequestId(request), ipAddress: request.ip, userAgent: String(request.headers['user-agent'] || ''),
      existingSessionToken: String(request.cookies?.mini_bi_session || ''),
    });
    const common = { sameSite: 'lax' as const, secure: this.environment.cookieSecure, path: '/', expires: result.sessionExpiresAt };
    reply.setCookie('mini_bi_session', result.sessionToken, { ...common, httpOnly: true });
    reply.setCookie('mini_bi_csrf', result.csrfToken, { ...common, httpOnly: false });
    return result.user;
  }

  @UseGuards(AuthRateLimitGuard) @Post('register') @HttpCode(200)
  register(@Body() body: { token?: string; invitationToken?: string; name?: string; displayName?: string; password?: string }) {
    return this.memberships.acceptInvitation(String(body.token || body.invitationToken || ''), String(body.displayName || body.name || ''), String(body.password || ''));
  }
}
