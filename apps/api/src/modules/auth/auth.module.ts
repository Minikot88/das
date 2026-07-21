import { Module } from '@nestjs/common';
import type { RuntimeEnvironment } from '../../app/config/environment.js';
import { ENVIRONMENT } from '../../app/config/token.js';
import { AuthService } from './application/auth.service.js';
import { SessionGuard } from './application/session.guard.js';
import { AUTH_PROVIDER } from './application/auth-provider.js';
import { DevelopmentAuthProvider } from './infrastructure/development-auth.provider.js';
import { ExternalAuthProvider } from './infrastructure/external-auth.provider.js';
import { AuthController } from './presentation/auth.controller.js';
import { LegacyAuthController } from './presentation/legacy-auth.controller.js';

@Module({
  controllers: [AuthController, LegacyAuthController],
  providers: [DevelopmentAuthProvider, ExternalAuthProvider, {
    provide: AUTH_PROVIDER,
    inject: [ENVIRONMENT, DevelopmentAuthProvider, ExternalAuthProvider],
    useFactory: (environment: RuntimeEnvironment, development: DevelopmentAuthProvider, external: ExternalAuthProvider) => environment.authProvider === 'development' ? development : external,
  }, AuthService, SessionGuard],
  exports: [AuthService, SessionGuard],
})
export class AuthModule {}
