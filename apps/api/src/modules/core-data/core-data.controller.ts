import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { CurrentPrincipal } from '../auth/application/current-principal.js';
import { SessionGuard } from '../auth/application/session.guard.js';
import type { RequestPrincipal } from '../projects/application/project.service.js';
import { ApiError } from '../../shared/http/api-error.js';
import { CoreDataService } from './core-data.service.js';

@Controller('api/v1')
@UseGuards(SessionGuard)
export class CoreDataController {
  constructor(private readonly data: CoreDataService) {}
  @Get('datasets') datasets(@CurrentPrincipal() p: RequestPrincipal, @Query('projectId') projectId: string, @Query('page') page?: string, @Query('pageSize') pageSize?: string) { return this.data.listDatasets(p, String(projectId || ''), Number(page || 1), Number(pageSize || 50)); }
  @Get('datasets/:id') dataset(@CurrentPrincipal() p: RequestPrincipal, @Param('id') id: string) { return this.data.dataset(p, id); }
  @Get('datasets/:id/fields') fields(@CurrentPrincipal() p: RequestPrincipal, @Param('id') id: string) { return this.data.fields(p, id); }
  @Post('datasets/:id/query') queryDataset(@CurrentPrincipal() p: RequestPrincipal, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.data.queryDataset(p, id, body || {}); }
  @Post('datasets/import') async importCsv(@CurrentPrincipal() p: RequestPrincipal, @Req() request: FastifyRequest) {
    const file = await request.file();
    if (!file) throw new ApiError(400, 'FILE_REQUIRED', 'CSV file is required.');
    const field = (name: string) => { const value = file.fields[name]; return value && !Array.isArray(value) && value.type === 'field' ? String(value.value || '') : ''; };
    return this.data.importCsv(p, file, { projectId: field('projectId'), name: field('name'), idempotencyKey: String(request.headers['idempotency-key'] || field('idempotencyKey') || '') });
  }
  @Get('dashboards') dashboards(@CurrentPrincipal() p: RequestPrincipal, @Query('projectId') projectId: string) { return this.data.listDashboards(p, String(projectId || '')); }
  @Get('dashboards/:id') dashboard(@CurrentPrincipal() p: RequestPrincipal, @Param('id') id: string) { return this.data.dashboard(p, id); }
  @Post('dashboards') createDashboard(@CurrentPrincipal() p: RequestPrincipal, @Body() body: Record<string, unknown>) { return this.data.createDashboard(p, body || {}); }
  @Patch('dashboards/:id') updateDashboard(@CurrentPrincipal() p: RequestPrincipal, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.data.updateDashboard(p, id, body || {}); }
  @Patch('dashboards/:id/widgets') widgets(@CurrentPrincipal() p: RequestPrincipal, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.data.saveWidgets(p, id, body || {}); }
  @Post('workspace/import') importWorkspace(@CurrentPrincipal() p: RequestPrincipal, @Body() body: Record<string, unknown>) { return this.data.importWorkspace(p, body || {}); }
  @Get('settings/preferences') preferences(@CurrentPrincipal() p: RequestPrincipal) { return this.data.preferences(p); }
  @Patch('settings/preferences') updatePreferences(@CurrentPrincipal() p: RequestPrincipal, @Body() body: Record<string, unknown>) { return this.data.updatePreferences(p, body || {}); }
}
