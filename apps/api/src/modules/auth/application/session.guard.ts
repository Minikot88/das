import { CanActivate, ExecutionContext, Inject, Injectable, Optional } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { RuntimeEnvironment } from '../../../app/config/environment.js';
import { ENVIRONMENT } from '../../../app/config/token.js';
import { ApiError } from '../../../shared/http/api-error.js';
import { AuthService, type SessionPrincipal } from './auth.service.js';
import { ExternalTokenVerifier } from '../infrastructure/external-token-verifier.js';

export type AuthenticatedRequest = FastifyRequest & { principal?: SessionPrincipal };


@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(ENVIRONMENT) private readonly environment: RuntimeEnvironment,
    @Optional() @Inject(ExternalTokenVerifier) private readonly externalTokens?: ExternalTokenVerifier,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    if (this.environment.authMode === 'disabled') {
      if (!this.environment.internalSingleUserId) throw new ApiError(503, 'DISABLED_AUTH_PRINCIPAL_MISSING', 'Disabled authentication requires INTERNAL_SINGLE_USER_ID.');
      request.principal = await this.auth.authenticateInternalSingleUser(this.environment.internalSingleUserId);
      return true;
    }
    const authorization = singleHeader(request.headers.authorization);
    if (!authorization.startsWith('Bearer ')) throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.');
    if (!this.externalTokens) throw new ApiError(503, 'EXTERNAL_AUTH_NOT_CONFIGURED', 'External authentication is not configured.');
    request.principal = await this.auth.resolveExternalIdentity(await this.externalTokens.verify(authorization.slice(7).trim()));
    return true;
  }
}

function singleHeader(value: string | string[] | undefined) {
  return Array.isArray(value) ? String(value[0] || '') : String(value || '');
}
