import { createHmac, timingSafeEqual } from 'node:crypto';
import { CanActivate, ExecutionContext, Inject, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import type { RuntimeEnvironment } from '../../../app/config/environment.js';
import { ENVIRONMENT } from '../../../app/config/token.js';
import { ApiError } from '../../../shared/http/api-error.js';

export type AuthenticatedRequest = FastifyRequest & { principal?: { organizationId: string; userId: string } };

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(@Inject(ENVIRONMENT) private readonly environment: RuntimeEnvironment) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const session = request.cookies?.mini_bi_session;
    if (!session) throw new ApiError(401, 'AUTHENTICATION_REQUIRED', 'Authentication is required.');
    const separator = session.lastIndexOf('.');
    const userId = session.slice(0, separator);
    const signature = session.slice(separator + 1);
    const expected = createHmac('sha256', this.environment.sessionSigningKey || 'test-only-session-key').update(userId).digest('base64url');
    const left = Buffer.from(signature);
    const right = Buffer.from(expected);
    if (!userId || left.length !== right.length || !timingSafeEqual(left, right)) throw new ApiError(401, 'INVALID_SESSION', 'The session is invalid.');
    request.principal = { organizationId: 'org-default', userId };
    return true;
  }
}
