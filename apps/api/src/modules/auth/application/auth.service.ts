import { createHmac } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { RuntimeEnvironment } from '../../../app/config/environment.js';
import { ENVIRONMENT } from '../../../app/config/token.js';
import { AUTH_PROVIDER, type AuthProvider } from './auth-provider.js';

@Injectable()
export class AuthService {
  constructor(
    @Inject(AUTH_PROVIDER) private readonly provider: AuthProvider,
    @Inject(ENVIRONMENT) private readonly environment: RuntimeEnvironment,
  ) {}

  async login(email: string, password: string) {
    const user = await this.provider.authenticate(email, password);
    const signature = createHmac('sha256', this.environment.sessionSigningKey || 'test-only-session-key').update(user.id).digest('base64url');
    return { user, session: `${user.id}.${signature}` };
  }
}
