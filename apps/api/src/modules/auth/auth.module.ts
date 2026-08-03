import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../infrastructure/database/database.module.js';
import { AuthService } from './application/auth.service.js';
import { AuthorizationService } from './application/authorization.service.js';
import { MembershipService } from './application/membership.service.js';
import { SessionGuard } from './application/session.guard.js';
import { ExternalTokenVerifier } from './infrastructure/external-token-verifier.js';
import { AuthController } from './presentation/auth.controller.js';
import { LegacyAuthController } from './presentation/legacy-auth.controller.js';
import { OrganizationMembershipController, ProjectMembershipController } from './presentation/membership.controller.js';
import { SessionController } from './presentation/session.controller.js';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController, LegacyAuthController, SessionController, OrganizationMembershipController, ProjectMembershipController],
  providers: [
    AuthService,
    AuthorizationService,
    MembershipService,
    SessionGuard,
    ExternalTokenVerifier,
  ],
  exports: [AuthService, AuthorizationService, SessionGuard],
})
export class AuthModule {}
