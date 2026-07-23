import { Module } from '@nestjs/common';
import type { RuntimeEnvironment } from '../../app/config/environment.js';
import { ENVIRONMENT } from '../../app/config/token.js';
import { AuthService } from './application/auth.service.js';
import { AccountService } from './application/account.service.js';
import { AuthorizationService } from './application/authorization.service.js';
import { MembershipService } from './application/membership.service.js';
import { MAIL_PROVIDER } from './application/mail-provider.js';
import { SessionGuard } from './application/session.guard.js';
import { AuthRateLimitGuard } from './application/auth-rate-limit.guard.js';
import { AUTH_PROVIDER } from './application/auth-provider.js';
import { DevelopmentAuthProvider } from './infrastructure/development-auth.provider.js';
import { ExternalAuthProvider } from './infrastructure/external-auth.provider.js';
import { DatabaseAuthProvider } from './infrastructure/database-auth.provider.js';
import { RuntimeMailProvider } from './infrastructure/mail.provider.js';
import { AuthController } from './presentation/auth.controller.js';
import { LegacyAuthController } from './presentation/legacy-auth.controller.js';
import { OrganizationMembershipController, ProjectMembershipController } from './presentation/membership.controller.js';

@Module({
  controllers: [AuthController, LegacyAuthController, OrganizationMembershipController, ProjectMembershipController],
  providers: [DevelopmentAuthProvider, ExternalAuthProvider, DatabaseAuthProvider, RuntimeMailProvider, { provide: MAIL_PROVIDER, useExisting: RuntimeMailProvider }, {
    provide: AUTH_PROVIDER,
    inject: [ENVIRONMENT, DatabaseAuthProvider, DevelopmentAuthProvider, ExternalAuthProvider],
    useFactory: (environment: RuntimeEnvironment, database: DatabaseAuthProvider, development: DevelopmentAuthProvider, external: ExternalAuthProvider) => environment.authProvider === 'database' ? database : environment.authProvider === 'development' ? development : external,
  }, AuthService, AccountService, AuthorizationService, MembershipService, SessionGuard, AuthRateLimitGuard],
  exports: [AuthService, AuthorizationService, SessionGuard],
})
export class AuthModule {}
