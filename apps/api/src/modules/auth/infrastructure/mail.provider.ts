import { Inject, Injectable } from '@nestjs/common';
import type { RuntimeEnvironment } from '../../../app/config/environment.js';
import { ENVIRONMENT } from '../../../app/config/token.js';
import type { MailProvider } from '../application/mail-provider.js';

@Injectable()
export class RuntimeMailProvider implements MailProvider {
  constructor(@Inject(ENVIRONMENT) private readonly environment: RuntimeEnvironment) {}

  async sendPasswordReset(_email: string, _token: string) {
    if (this.environment.nodeEnv === 'production') return;
    // No token is logged. Administrators can use the invitation/reset API response workflow only when explicitly exposed by a development tool.
  }
}
