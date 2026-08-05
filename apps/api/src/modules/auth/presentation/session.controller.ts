import { Controller, Get, Header, Inject, UseGuards } from '@nestjs/common';
import { CurrentPrincipal } from '../application/current-principal.js';
import { AuthService, type SessionPrincipal } from '../application/auth.service.js';
import { SessionGuard } from '../application/session.guard.js';

@Controller('api/session')
export class SessionController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
  @UseGuards(SessionGuard) @Get('me') @Header('Cache-Control', 'no-store')
  async me(@CurrentPrincipal() principal: SessionPrincipal) {
    const user = await this.auth.me(principal);
    return {
      data: {
        authenticated: true,
        authMode: principal.authMode,
        actorId: user.id,
        displayName: user.name,
        organizationId: user.organizationId,
        roles: user.roles,
        permissions: user.permissions || [],
        projectScopes: user.projectScopes || [],
      },
    };
  }
}
