import { timingSafeEqual } from 'node:crypto';
import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { RuntimeEnvironment } from '../../../app/config/environment.js';
import { ENVIRONMENT } from '../../../app/config/token.js';
import { ApiError } from '../../../shared/http/api-error.js';
import { AuthService, type SessionPrincipal } from './auth.service.js';

export type AuthenticatedRequest = FastifyRequest & { principal?: SessionPrincipal };
export const APPLICATION_SESSIONS = Symbol('APPLICATION_SESSIONS');
type ApplicationSessions = { authenticate(token: string, csrfToken?: string): Promise<SessionPrincipal> };


@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(ENVIRONMENT) private readonly environment: RuntimeEnvironment,
    @Inject(APPLICATION_SESSIONS) private readonly sessions: ApplicationSessions,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (this.environment.authMode === 'disabled') {
      if (!this.environment.internalSingleUserId) throw new ApiError(503, 'DISABLED_AUTH_PRINCIPAL_MISSING', 'Disabled authentication requires INTERNAL_SINGLE_USER_ID.');
      request.principal = await this.auth.authenticateInternalSingleUser(this.environment.internalSingleUserId);
      return true;
    }
    const token = cookieValue(singleHeader(request.headers.cookie), this.environment.sessionCookieName || 'dashboardmini_session');
    if (!token) throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.');
    let csrfToken: string | undefined;
    if (isUnsafeMethod(request.method)) {
      if (!this.environment.appUrl || singleHeader(request.headers.origin) !== this.environment.appUrl) {
        throw new ApiError(403, 'CSRF_ORIGIN_INVALID', 'The request origin could not be verified.');
      }
      const headerToken = singleHeader(request.headers['x-csrf-token']);
      const cookieToken = cookieValue(singleHeader(request.headers.cookie), 'dashboardmini_csrf');
      if (!headerToken || !cookieToken || !safeEqual(headerToken, cookieToken)) {
        throw new ApiError(403, 'CSRF_TOKEN_INVALID', 'The request could not be verified.');
      }
      csrfToken = headerToken;
    }
    request.principal = csrfToken
      ? await this.sessions.authenticate(token, csrfToken)
      : await this.sessions.authenticate(token);
    return true;
  }
}

function singleHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}

function cookieValue(header: string, name: string) {
  for (const part of header.split(';')) {
    const separator = part.indexOf('=');
    if (separator < 1) continue;
    if (part.slice(0, separator).trim() !== name) continue;
    const value = part.slice(separator + 1).trim();
    return /^[A-Za-z0-9_-]{32,512}$/.test(value) ? value : '';
  }
  return '';
}

function isUnsafeMethod(method: string | undefined) {
  return ['POST', 'PUT', 'PATCH', 'DELETE'].includes(String(method || 'GET').toUpperCase());
}

function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left, 'utf8');
  const rightBuffer = Buffer.from(right, 'utf8');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}
