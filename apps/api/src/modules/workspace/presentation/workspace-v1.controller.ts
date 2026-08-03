import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Inject, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentPrincipal } from '../../auth/application/current-principal.js';
import { SessionGuard } from '../../auth/application/session.guard.js';
import type { RequestPrincipal } from '../../projects/application/project.service.js';
import { WorkspaceDataService } from '../application/workspace-data.service.js';

@Controller('api/v1')
@UseGuards(SessionGuard)
export class WorkspaceV1Controller {
  constructor(@Inject(WorkspaceDataService) private readonly data: WorkspaceDataService) {}

  @Get('chart-types') chartTypes() { return this.data.getChartTypes(); }
  @Get('chart-templates') chartTemplates() { return this.data.getChartTemplates(); }
  @Get('chart-templates/:id') chartTemplate(@Param('id') id: string) { return this.data.getChartTemplate(id); }
  @Get('charts') charts(@CurrentPrincipal() principal: RequestPrincipal, @Query('projectId') projectId?: string) {
    return this.data.listCharts(principal, projectId ? String(projectId) : undefined);
  }
  @Get('charts/:id') chart(@CurrentPrincipal() principal: RequestPrincipal, @Param('id') id: string) { return this.data.getChart(principal, id); }
  @Post('charts') @HttpCode(HttpStatus.CREATED) createChart(@CurrentPrincipal() principal: RequestPrincipal, @Body() body: Record<string, unknown>) { return this.data.createChart(principal, body || {}); }
  @Patch('charts/:id') updateChart(@CurrentPrincipal() principal: RequestPrincipal, @Param('id') id: string, @Body() body: Record<string, unknown>) { return this.data.updateChart(principal, id, body || {}); }
  @Delete('charts/:id') deleteChart(@CurrentPrincipal() principal: RequestPrincipal, @Param('id') id: string) { return this.data.deleteChart(principal, id); }
  @Get('dashboards/:id/charts') dashboardCharts(@CurrentPrincipal() principal: RequestPrincipal, @Param('id') id: string) { return this.data.dashboardCharts(principal, id); }
  @Post('dashboards/:id/charts') @HttpCode(HttpStatus.CREATED) attachChart(@CurrentPrincipal() principal: RequestPrincipal, @Param('id') id: string, @Body() body: { chartId?: string }) { return this.data.attachChart(principal, id, String(body.chartId || '')); }
  @Post('dataset/query') @HttpCode(HttpStatus.OK) queryDataset(@CurrentPrincipal() principal: RequestPrincipal, @Body() body: { sql?: string }) { return this.data.queryDataset(principal, String(body.sql || '')); }
}
