import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import type { SessionPrincipal } from '../application/auth.service.js';
import { CurrentPrincipal } from '../application/current-principal.js';
import { MembershipService } from '../application/membership.service.js';
import { SessionGuard } from '../application/session.guard.js';
import { builtInAuthRemoved } from './auth.controller.js';

@Controller('api/v1/organizations/:id')
@UseGuards(SessionGuard)
export class OrganizationMembershipController {
  constructor(@Inject(MembershipService) private readonly memberships: MembershipService) {}
  @Get('members') members(@CurrentPrincipal() p: SessionPrincipal, @Param('id') id: string) { return this.memberships.listOrganizationMembers(p, id); }
  @Get('invitations') invitations() { throw builtInAuthRemoved(); }
  @Post('invitations') createInvitation() { throw builtInAuthRemoved(); }
  @Delete('invitations/:invitationId') revokeInvitation() { throw builtInAuthRemoved(); }
  @Patch('members/:userId') updateMember(@CurrentPrincipal() p: SessionPrincipal, @Param('id') id: string, @Param('userId') userId: string, @Body() body: { role?: string; status?: string }) {
    return body.status ? this.memberships.setUserStatus(p, id, userId, String(body.status)) : this.memberships.updateOrganizationMember(p, id, userId, String(body.role || ''));
  }
  @Delete('members/:userId') removeMember(@CurrentPrincipal() p: SessionPrincipal, @Param('id') id: string, @Param('userId') userId: string) { return this.memberships.removeOrganizationMember(p, id, userId); }
  @Post('members/:userId/password-reset') createPasswordReset() { throw builtInAuthRemoved(); }
}

@Controller('api/v1/projects/:id/members')
@UseGuards(SessionGuard)
export class ProjectMembershipController {
  constructor(@Inject(MembershipService) private readonly memberships: MembershipService) {}
  @Get() members(@CurrentPrincipal() p: SessionPrincipal, @Param('id') id: string) { return this.memberships.listProjectMembers(p, id); }
  @Post() add(@CurrentPrincipal() p: SessionPrincipal, @Param('id') id: string, @Body() body: { userId?: string; role?: string }) { return this.memberships.setProjectMember(p, id, String(body.userId || ''), String(body.role || '')); }
  @Patch(':userId') update(@CurrentPrincipal() p: SessionPrincipal, @Param('id') id: string, @Param('userId') userId: string, @Body() body: { role?: string }) { return this.memberships.setProjectMember(p, id, userId, String(body.role || '')); }
  @Delete(':userId') remove(@CurrentPrincipal() p: SessionPrincipal, @Param('id') id: string, @Param('userId') userId: string) { return this.memberships.removeProjectMember(p, id, userId); }
}
