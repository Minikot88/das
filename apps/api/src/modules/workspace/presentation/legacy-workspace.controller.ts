import { Body, Controller, Delete, Get, Inject, Param, Post, Put, Res, UseGuards } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { CurrentPrincipal } from '../../auth/application/current-principal.js';
import { SessionGuard } from '../../auth/application/session.guard.js';
import type { RequestPrincipal } from '../../projects/application/project.service.js';
import { WorkspaceDataService } from '../application/workspace-data.service.js';

@Controller('api')
@UseGuards(SessionGuard)
export class LegacyWorkspaceController {
  constructor(@Inject(WorkspaceDataService) private readonly data: WorkspaceDataService) {}
  @Get('chart-types') async types(@Res() reply: FastifyReply) { return reply.send(await this.data.getChartTypes()); }
  @Get('chart-templates') async templates(@Res() reply: FastifyReply) { return reply.send(await this.data.getChartTemplates()); }
  @Get('chart-templates/:id') async template(@Param('id') id: string, @Res() reply: FastifyReply) { return reply.send(await this.data.getChartTemplate(id)); }
  @Get('charts') async charts(@CurrentPrincipal() p: RequestPrincipal, @Res() reply: FastifyReply) { return reply.send(await this.data.listCharts(p)); }
  @Get('charts/:id') async chart(@CurrentPrincipal() p: RequestPrincipal, @Param('id') id: string, @Res() reply: FastifyReply) { return reply.send(await this.data.getChart(p, id)); }
  @Post('charts') async createChart(@CurrentPrincipal() p: RequestPrincipal, @Body() body: Record<string, unknown>, @Res() reply: FastifyReply) { return reply.status(201).send(await this.data.createChart(p, body)); }
  @Put('charts/:id') async updateChart(@CurrentPrincipal() p: RequestPrincipal, @Param('id') id: string, @Body() body: Record<string, unknown>, @Res() reply: FastifyReply) { return reply.send(await this.data.updateChart(p, id, body)); }
  @Delete('charts/:id') async deleteChart(@CurrentPrincipal() p: RequestPrincipal, @Param('id') id: string, @Res() reply: FastifyReply) { return reply.send(await this.data.deleteChart(p, id)); }
  @Get('dashboards/:id/charts') async dashboardCharts(@CurrentPrincipal() p: RequestPrincipal, @Param('id') id: string, @Res() reply: FastifyReply) { return reply.send(await this.data.dashboardCharts(p, id)); }
  @Post('dashboards/:id/charts') async attach(@CurrentPrincipal() p: RequestPrincipal, @Param('id') id: string, @Body() body: { chartId?: string }, @Res() reply: FastifyReply) { return reply.status(201).send(await this.data.attachChart(p, id, String(body.chartId || ''))); }
  @Get('dashboards/:id') async dashboard(@CurrentPrincipal() p: RequestPrincipal, @Param('id') id: string, @Res() reply: FastifyReply) { return reply.send(await this.data.dashboardContext(p, id)); }
  @Get('dataset') async dataset(@CurrentPrincipal() p: RequestPrincipal, @Res() reply: FastifyReply) { return reply.send(await this.data.getDataset(p)); }
  @Get('dataset/schema') async schema(@CurrentPrincipal() p: RequestPrincipal, @Res() reply: FastifyReply) { return reply.send(await this.data.getDatasetSchema(p)); }
  @Post('dataset/query') async query(@CurrentPrincipal() p: RequestPrincipal, @Body() body: { sql?: string }, @Res() reply: FastifyReply) { return reply.send(await this.data.queryDataset(p, String(body.sql || ''))); }
}
