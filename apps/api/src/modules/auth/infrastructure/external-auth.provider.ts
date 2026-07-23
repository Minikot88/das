import { Injectable } from '@nestjs/common';
import { ApiError } from '../../../shared/http/api-error.js';
import type { AuthenticatedUser, AuthProvider } from '../application/auth-provider.js';

@Injectable()
export class ExternalAuthProvider implements AuthProvider {
  async authenticate(_email: string, _password: string): Promise<AuthenticatedUser> {
    throw new ApiError(503, 'AUTH_PROVIDER_NOT_CONFIGURED', 'External authentication provider is not configured.', undefined, true);
  }
}
