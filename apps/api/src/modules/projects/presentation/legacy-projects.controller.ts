import { Body, Controller, Get, Post, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { CurrentPrincipal } from '../../auth/application/current-principal.js';
import { SessionGuard } from '../../auth/application/session.guard.js';
import { ProjectService, type RequestPrincipal } from '../application/project.service.js';

@Controller('api/projects')
@UseGuards(SessionGuard)
export class LegacyProjectsController {
  constructor(private readonly projects: ProjectService) {}
  @Get() async list(@CurrentPrincipal() principal: RequestPrincipal, @Res() reply: FastifyReply) { return reply.send(await this.projects.list(principal)); }
  @Post() async create(@CurrentPrincipal() principal: RequestPrincipal, @Body() body: { name?: string }, @Res() reply: FastifyReply) { return reply.status(201).send(await this.projects.create(principal, String(body.name || ''))); }
}
