import { timingSafeEqual } from 'node:crypto';
import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { RuntimeEnvironment } from '../../../app/config/environment.js';
import { ENVIRONMENT } from '../../../app/config/token.js';
import { ApiError } from '../../../shared/http/api-error.js';
import { hashOpaqueToken } from '../domain/auth-security.js';
import { AuthService, type SessionPrincipal } from './auth.service.js';

export type AuthenticatedRequest = FastifyRequest & { principal?: SessionPrincipal };

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    private readonly auth: AuthService,
    @Inject(ENVIRONMENT) private readonly environment: RuntimeEnvironment,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (this.environment.internalSingleUserId) {
      request.principal = await this.auth.authenticateInternalSingleUser(this.environment.internalSingleUserId);
      return true;
    }
    const sessionToken = String(request.cookies?.mini_bi_session || '');
    if (!sessionToken) throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.');
    const principal = await this.auth.authenticateSession(sessionToken);
    if (!SAFE_METHODS.has(request.method.toUpperCase())) this.assertCsrf(request, principal);
    request.principal = principal;
    return true;
  }

  private assertCsrf(request: AuthenticatedRequest, principal: SessionPrincipal) {
    const origin = request.headers.origin || originFromReferer(request.headers.referer);
    if (!origin || !this.environment.corsOrigins.includes(origin)) throw csrfRejected();
    const cookieToken = String(request.cookies?.mini_bi_csrf || '');
    const headerToken = singleHeader(request.headers['x-csrf-token']);
    if (!cookieToken || !headerToken || !safeEqual(cookieToken, headerToken)) throw csrfRejected();
    if (!safeEqual(hashOpaqueToken(headerToken), principal.csrfTokenHash)) throw csrfRejected();
  }
}

function singleHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}

function originFromReferer(value: string | undefined) {
  if (!value) return '';
  try { return new URL(value).origin; } catch { return ''; }
}

function safeEqual(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

function csrfRejected() {
  return new ApiError(403, 'CSRF_REJECTED', 'The request could not be verified.');
}
