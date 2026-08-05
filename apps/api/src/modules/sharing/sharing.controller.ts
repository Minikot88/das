import { Body, Controller, Get, Inject, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { CurrentPrincipal } from '../auth/application/current-principal.js';
import { SessionGuard } from '../auth/application/session.guard.js';
import type { RequestPrincipal } from '../projects/application/project.service.js';
import { SharingService } from './sharing.service.js';

@Controller(['api/v1/shares', 'api/shares'])
export class PublicSharingController {
  constructor(@Inject(SharingService) private readonly sharing: SharingService) {}
  @Get(':token') resolve(@Param('token') token: string, @Req() request: FastifyRequest) { return this.sharing.resolve(token, request); }
}

@Controller(['api/v1/shares', 'api/shares'])
@UseGuards(SessionGuard)
export class SharingController {
  constructor(@Inject(SharingService) private readonly sharing: SharingService) {}
  @Post() create(@CurrentPrincipal() p: RequestPrincipal, @Body() body: Record<string, unknown>) { return this.sharing.create(p, body || {}); }
  @Patch(':id/revoke') revoke(@CurrentPrincipal() p: RequestPrincipal, @Param('id') id: string, @Body() body: { revision?: number }) { return this.sharing.revoke(p, id, Number(body?.revision)); }
}
