import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { ensureRequestId } from '../../shared/http/request-id.js';
import { CurrentPrincipal } from '../auth/application/current-principal.js';
import { SessionGuard } from '../auth/application/session.guard.js';
import type { RequestPrincipal } from '../projects/application/project.service.js';
import { ConnectionsService } from './connections.service.js';

@Controller(['api/v1/connections', 'api/connections'])
@UseGuards(SessionGuard)
export class ConnectionsController {
  constructor(private readonly connections: ConnectionsService) {}
  @Get() list(@CurrentPrincipal() p: RequestPrincipal, @Query('projectId') projectId: string) { return this.connections.list(p, String(projectId || '')); }
  @Post() create(@CurrentPrincipal() p: RequestPrincipal, @Body() body: Record<string, unknown>) { return this.connections.create(p, body || {}); }
  @Post('test') @HttpCode(HttpStatus.OK) testCredentials(@Body() body: Record<string, unknown>) { return this.connections.testCredentials(body || {}); }
  @Post(':id/test') @HttpCode(HttpStatus.OK) test(@CurrentPrincipal() p: RequestPrincipal, @Param('id') id: string) { return this.connections.test(p, id); }
  @Get(':id/schema') schema(@CurrentPrincipal() p: RequestPrincipal, @Param('id') id: string) { return this.connections.discover(p, id); }
  @Post(':id/query') @HttpCode(HttpStatus.OK) query(@CurrentPrincipal() p: RequestPrincipal, @Param('id') id: string, @Body() body: { sql?: string; parameters?: unknown[] }, @Req() request: FastifyRequest) { return this.connections.execute(p, id, String(body?.sql || ''), Array.isArray(body?.parameters) ? body.parameters : [], ensureRequestId(request)); }
  @Delete(':id') remove(@CurrentPrincipal() p: RequestPrincipal, @Param('id') id: string, @Body() body: { revision?: number }) { return this.connections.remove(p, id, Number(body?.revision)); }
}
