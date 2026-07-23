import { timingSafeEqual } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { RuntimeEnvironment } from '../../../app/config/environment.js';
import { ENVIRONMENT } from '../../../app/config/token.js';
import { ApiError } from '../../../shared/http/api-error.js';
import type { AuthenticatedUser, AuthProvider } from '../application/auth-provider.js';

function safeEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  return a.length === b.length && timingSafeEqual(a, b);
}

@Injectable()
export class DevelopmentAuthProvider implements AuthProvider {
  constructor(@Inject(ENVIRONMENT) private readonly environment: RuntimeEnvironment) {}

  async authenticate(email: string, password: string): Promise<AuthenticatedUser> {
    const expectedEmail = this.environment.developmentAuthEmail || 'demo@dataviz.bi';
    const expectedPassword = this.environment.developmentAuthPassword || 'demo1234';
    if (!safeEqual(String(email || ''), expectedEmail) || !safeEqual(String(password || ''), expectedPassword)) {
      throw new ApiError(401, 'INVALID_CREDENTIALS', 'Email or password is incorrect.');
    }
    return { id: 'user-development', organizationId: 'org-default', email: expectedEmail, name: 'Development User', roles: ['owner'] };
  }
}
