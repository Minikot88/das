import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Post, Req, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import type { RuntimeEnvironment } from '../../../app/config/environment.js';
import { ENVIRONMENT } from '../../../app/config/token.js';
import { ensureRequestId } from '../../../shared/http/request-id.js';
import { AccountService } from '../application/account.service.js';
import { AuthService, type SessionPrincipal } from '../application/auth.service.js';
import { CurrentPrincipal } from '../application/current-principal.js';
import { MembershipService } from '../application/membership.service.js';
import { SessionGuard } from '../application/session.guard.js';
import { AuthRateLimitGuard } from '../application/auth-rate-limit.guard.js';

type LoginBody = { email?: string; password?: string };

@Controller('api/v1/auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly account: AccountService,
    private readonly memberships: MembershipService,
    @Inject(ENVIRONMENT) private readonly environment: RuntimeEnvironment,
  ) {}

  @UseGuards(AuthRateLimitGuard) @Post('login') @HttpCode(200)
  async login(@Body() body: LoginBody, @Req() request: FastifyRequest, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.auth.login(String(body.email || ''), String(body.password || ''), {
      requestId: ensureRequestId(request),
      ipAddress: request.ip,
      userAgent: String(request.headers['user-agent'] || ''),
      existingSessionToken: String(request.cookies?.mini_bi_session || ''),
    });
    this.setAuthCookies(reply, result.sessionToken, result.csrfToken, result.sessionExpiresAt);
    return result.user;
  }

  @UseGuards(AuthRateLimitGuard) @Post('forgot-password') @HttpCode(200)
  forgotPassword(@Body() body: { email?: string }, @Req() request: FastifyRequest) {
    return this.account.forgotPassword(String(body.email || ''), { requestId: ensureRequestId(request), ipAddress: request.ip });
  }

  @UseGuards(AuthRateLimitGuard) @Post('reset-password') @HttpCode(200)
  resetPassword(@Body() body: { token?: string; password?: string }) {
    return this.account.resetPassword(String(body.token || ''), String(body.password || ''));
  }

  @UseGuards(AuthRateLimitGuard) @Post('accept-invitation') @HttpCode(200)
  acceptInvitation(@Body() body: { token?: string; invitationToken?: string; displayName?: string; name?: string; password?: string }) {
    return this.memberships.acceptInvitation(String(body.token || body.invitationToken || ''), String(body.displayName || body.name || ''), String(body.password || ''));
  }

  @UseGuards(SessionGuard) @Post('logout') @HttpCode(200)
  async logout(@CurrentPrincipal() principal: SessionPrincipal, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.auth.logout(principal.sessionId, principal.userId);
    this.clearAuthCookies(reply);
    return result;
  }

  @UseGuards(SessionGuard) @Post('logout-all') @HttpCode(200)
  async logoutAll(@CurrentPrincipal() principal: SessionPrincipal, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.auth.logoutAll(principal.userId);
    this.clearAuthCookies(reply);
    return result;
  }

  @UseGuards(SessionGuard) @Get('me')
  me(@CurrentPrincipal() principal: SessionPrincipal) { return this.auth.me(principal); }

  @UseGuards(SessionGuard) @Post('change-password') @HttpCode(200)
  async changePassword(@CurrentPrincipal() principal: SessionPrincipal, @Body() body: { currentPassword?: string; newPassword?: string }, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.account.changePassword(principal, String(body.currentPassword || ''), String(body.newPassword || ''));
    this.clearAuthCookies(reply);
    return result;
  }

  @UseGuards(SessionGuard) @Get('sessions')
  sessions(@CurrentPrincipal() principal: SessionPrincipal) { return this.auth.listSessions(principal); }

  @UseGuards(SessionGuard) @Delete('sessions/:id')
  async revokeSession(@CurrentPrincipal() principal: SessionPrincipal, @Param('id') id: string, @Res({ passthrough: true }) reply: FastifyReply) {
    const result = await this.auth.revokeSession(principal, id);
    if (result.current) this.clearAuthCookies(reply);
    return result;
  }

  private setAuthCookies(reply: FastifyReply, sessionToken: string, csrfToken: string, expires: Date) {
    const common = { sameSite: 'lax' as const, secure: this.environment.cookieSecure, path: '/', expires };
    reply.setCookie('mini_bi_session', sessionToken, { ...common, httpOnly: true });
    reply.setCookie('mini_bi_csrf', csrfToken, { ...common, httpOnly: false });
  }

  private clearAuthCookies(reply: FastifyReply) {
    const options = { sameSite: 'lax' as const, secure: this.environment.cookieSecure, path: '/' };
    reply.clearCookie('mini_bi_session', options);
    reply.clearCookie('mini_bi_csrf', options);
  }
}
