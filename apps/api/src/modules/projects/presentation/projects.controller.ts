import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentPrincipal } from '../../auth/application/current-principal.js';
import { SessionGuard } from '../../auth/application/session.guard.js';
import { ProjectService, type RequestPrincipal } from '../application/project.service.js';

@Controller('api/v1/projects')
@UseGuards(SessionGuard)
export class ProjectsController {
  constructor(@Inject(ProjectService) private readonly projects: ProjectService) {}
  @Get() list(@CurrentPrincipal() principal: RequestPrincipal) { return this.projects.list(principal); }
  @Get(':id') get(@CurrentPrincipal() principal: RequestPrincipal, @Param('id') id: string) { return this.projects.get(principal, id); }
  @Post() create(@CurrentPrincipal() principal: RequestPrincipal, @Body() body: { name?: string }) { return this.projects.create(principal, String(body.name || '')); }
  @Patch(':id') update(@CurrentPrincipal() principal: RequestPrincipal, @Param('id') id: string, @Body() body: { name?: string; revision?: number }) { return this.projects.update(principal, id, { name: String(body.name || ''), revision: Number(body.revision) }); }
  @Delete(':id') remove(@CurrentPrincipal() principal: RequestPrincipal, @Param('id') id: string, @Body() body: { revision?: number }) { return this.projects.remove(principal, id, Number(body.revision)); }
}
