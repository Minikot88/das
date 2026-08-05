import { Body, Controller, Get, Inject, Param, Post, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { CurrentPrincipal } from '../auth/application/current-principal.js';
import { SessionGuard } from '../auth/application/session.guard.js';
import type { RequestPrincipal } from '../projects/application/project.service.js';
import { ExportsService } from './exports.service.js';

@Controller(['api/v1/exports', 'api/exports'])
@UseGuards(SessionGuard)
export class ExportsController {
  constructor(@Inject(ExportsService) private readonly exports: ExportsService) {}
  @Post() create(@CurrentPrincipal() p: RequestPrincipal, @Body() body: Record<string, unknown>) { return this.exports.create(p, body || {}); }
  @Get(':id/file') async file(@CurrentPrincipal() p: RequestPrincipal, @Param('id') id: string, @Res() reply: FastifyReply) { const file = await this.exports.file(p, id); return reply.header('content-type', file.mimeType).header('content-disposition', `attachment; filename*=UTF-8''${encodeURIComponent(file.filename)}`).header('x-content-type-options', 'nosniff').send(file.bytes); }
}
