import { randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { RuntimeEnvironment } from '../../../app/config/environment.js';
import { ENVIRONMENT } from '../../../app/config/token.js';
import { PrismaService } from '../../../infrastructure/database/prisma.service.js';
import { ApiError } from '../../../shared/http/api-error.js';
import { validateReadOnlySql } from '../../queries/domain/query-policy.js';
import type { RequestPrincipal } from '../../projects/application/project.service.js';
import { AuthorizationService } from '../../auth/application/authorization.service.js';

type JsonMap = Record<string, unknown>;
type MemoryChart = JsonMap & { id: string; organizationId: string; projectId: string; name: string; revision: number; createdAt: Date; updatedAt: Date };
type MemoryWidget = { id: string; organizationId: string; dashboardId: string; chartId: string; type: string; x: number; y: number; width: number; height: number; zIndex: number; revision: number };

@Injectable()
export class WorkspaceDataService {
  private readonly charts: MemoryChart[] = [];
  private readonly widgets: MemoryWidget[] = [];
  constructor(private readonly prisma: PrismaService, @Inject(ENVIRONMENT) private readonly environment: RuntimeEnvironment, private readonly authorization: AuthorizationService) {}
  private get memory() { return this.environment.nodeEnv === 'test'; }

  private async accessibleProjectIds(principal: RequestPrincipal) {
    const memberships = await this.prisma.biProjectMember.findMany({
      where: { organizationId: principal.organizationId, userId: principal.userId },
      select: { projectId: true },
    });
    const projects = await this.prisma.biProject.findMany({
      where: {
        organizationId: principal.organizationId,
        deletedAt: null,
        OR: [{ ownerUserId: principal.userId }, { id: { in: memberships.map(item => item.projectId) } }],
      },
      select: { id: true },
    });
    return projects.map(item => item.id);
  }

  private async assertProjectAccess(principal: RequestPrincipal, projectId: string) {
    const accessibleIds = await this.accessibleProjectIds(principal);
    if (!accessibleIds.includes(projectId)) throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project was not found.');
    return accessibleIds;
  }

  private async resolveChartTypeId(value: unknown) {
    const requested = optionalString(value);
    if (!requested) return null;
    const chartType = await this.prisma.chartType.findFirst({
      where: { OR: [{ id: requested }, { code: requested }] },
      select: { id: true },
    });
    if (chartType) return chartType.id;
    const template = await this.prisma.chartTemplate.findFirst({
      where: { OR: [{ id: requested }, { code: requested }] },
      select: { chartTypeId: true },
    });
    return template?.chartTypeId ?? null;
  }

  async getChartTypes() {
    if (this.memory) return [];
    return this.prisma.chartType.findMany({ orderBy: { code: 'asc' } });
  }
  async getChartTemplates() {
    if (this.memory) return [];
    const rows = await this.prisma.chartTemplate.findMany({ orderBy: { code: 'asc' } });
    return rows.map(item => ({ ...item, mapping: item.defaultMappingJson, settings: item.defaultSettingsJson }));
  }
  async getChartTemplate(id: string) {
    if (this.memory) throw new ApiError(404, 'CHART_TEMPLATE_NOT_FOUND', 'Chart template was not found.');
    const item = await this.prisma.chartTemplate.findFirst({ where: { OR: [{ id }, { code: id }] } });
    if (!item) throw new ApiError(404, 'CHART_TEMPLATE_NOT_FOUND', 'Chart template was not found.');
    return { ...item, mapping: item.defaultMappingJson, settings: item.defaultSettingsJson };
  }

  async listCharts(principal: RequestPrincipal, projectId?: string) {
    if (projectId) await this.authorization.assertProjectPermission(principal as never, projectId, 'read');
    if (this.memory) return this.charts.filter(item =>
      item.organizationId === principal.organizationId && (!projectId || item.projectId === projectId)
    );
    const projectIds = await this.accessibleProjectIds(principal);
    const scopedProjectIds = projectId && projectIds.includes(projectId) ? [projectId] : projectId ? [] : projectIds;
    const rows = await this.prisma.chart.findMany({ where: { organizationId: principal.organizationId, projectId: { in: scopedProjectIds }, deletedAt: null }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }] });
    return rows.map(mapChart);
  }
  async getChart(principal: RequestPrincipal, id: string) {
    const projectIds = this.memory ? [] : await this.accessibleProjectIds(principal);
    const item = this.memory ? this.charts.find(chart => chart.organizationId === principal.organizationId && chart.id === id) : await this.prisma.chart.findFirst({ where: { organizationId: principal.organizationId, projectId: { in: projectIds }, id, deletedAt: null } });
    if (!item) throw new ApiError(404, 'CHART_NOT_FOUND', 'Chart was not found.');
    return this.memory ? item : mapChart(item);
  }
  async createChart(principal: RequestPrincipal, payload: JsonMap) {
    const projectId = String(payload.projectId || payload.sourceProjectId || '');
    if (!projectId) throw new ApiError(400, 'VALIDATION_ERROR', 'projectId is required.', { projectId: 'Required' });
    await this.authorization.assertProjectPermission(principal as never, projectId, 'write');
    const now = new Date();
    const common = { id: String(payload.id || `chart-${randomUUID()}`), organizationId: principal.organizationId, projectId, name: String(payload.name || payload.title || 'Untitled chart'), revision: 0, createdAt: now, updatedAt: now };
    if (this.memory) { const item = { ...payload, ...common }; this.charts.push(item); return item; }
    await this.assertProjectAccess(principal, projectId);
    const datasetId = optionalString(payload.datasetId || payload.dataset);
    if (datasetId) {
      const dataset = await this.prisma.dataset.findFirst({ where: { id: datasetId, organizationId: principal.organizationId, projectId, deletedAt: null }, select: { id: true } });
      if (!dataset) throw new ApiError(404, 'DATASET_NOT_FOUND', 'Dataset was not found.');
    }
    const chartTypeId = await this.resolveChartTypeId(payload.chartTypeId || payload.templateId || asJsonMap(payload.config).chartType || asJsonMap(payload.config).type);
    const item = await this.prisma.chart.create({ data: {
      ...common,
      datasetId,
      chartTypeId,
      engine: String(payload.engine || 'chartjs'),
      mappingJson: asJson(payload.mapping),
      settingsJson: asJson(payload.settings),
      filtersJson: asJson(payload.filters),
      configJson: asJson(payload.config),
      queryDefinitionJson: asJson({ queryMode: payload.queryMode, generatedSql: payload.generatedSql, customSql: payload.customSql }),
      dataContractJson: asJson(buildChartDataContract(payload, datasetId)),
    } });
    return mapChart(item);
  }
  async updateChart(principal: RequestPrincipal, id: string, payload: JsonMap) {
    const expectedRevision = Number(payload.revision);
    if (this.memory) {
      const item = this.charts.find(chart => chart.organizationId === principal.organizationId && chart.id === id);
      if (!item) throw new ApiError(404, 'CHART_NOT_FOUND', 'Chart was not found.');
      if (Number.isFinite(expectedRevision) && item.revision !== expectedRevision) throw new ApiError(409, 'REVISION_CONFLICT', 'Chart has changed since it was loaded.', undefined, false, item.revision);
      Object.assign(item, payload, { id, revision: item.revision + 1, updatedAt: new Date() }); return item;
    }
    const projectIds = await this.accessibleProjectIds(principal);
    const current = await this.prisma.chart.findFirst({ where: { organizationId: principal.organizationId, projectId: { in: projectIds }, id, deletedAt: null } });
    if (!current) throw new ApiError(404, 'CHART_NOT_FOUND', 'Chart was not found.');
    await this.authorization.assertProjectPermission(principal as never, current.projectId, 'write');
    if (!Number.isFinite(expectedRevision) || current.revision !== expectedRevision) throw new ApiError(409, 'REVISION_CONFLICT', 'Chart has changed since it was loaded.', undefined, false, current.revision);
    const nextDatasetId = optionalString(payload.datasetId || payload.dataset) ?? current.datasetId;
    if (nextDatasetId) {
      const dataset = await this.prisma.dataset.findFirst({ where: { id: nextDatasetId, organizationId: principal.organizationId, projectId: current.projectId, deletedAt: null }, select: { id: true } });
      if (!dataset) throw new ApiError(404, 'DATASET_NOT_FOUND', 'Dataset was not found.');
    }
    const chartTypeId = await this.resolveChartTypeId(payload.chartTypeId || payload.templateId || asJsonMap(payload.config).chartType || asJsonMap(payload.config).type);
    const updated = await this.prisma.chart.update({ where: { id }, data: {
      name: String(payload.name || payload.title || current.name),
      datasetId: nextDatasetId,
      chartTypeId: chartTypeId ?? current.chartTypeId,
      mappingJson: asJson(payload.mapping),
      settingsJson: asJson(payload.settings),
      filtersJson: asJson(payload.filters),
      configJson: asJson(payload.config),
      queryDefinitionJson: asJson({ queryMode: payload.queryMode, generatedSql: payload.generatedSql, customSql: payload.customSql }),
      dataContractJson: asJson(buildChartDataContract(payload, nextDatasetId)),
      revision: { increment: 1 },
    } });
    return mapChart(updated);
  }
  async deleteChart(principal: RequestPrincipal, id: string) {
    if (this.memory) { const index = this.charts.findIndex(item => item.organizationId === principal.organizationId && item.id === id); if (index < 0) throw new ApiError(404, 'CHART_NOT_FOUND', 'Chart was not found.'); this.charts.splice(index, 1); return { success: true }; }
    const projectIds = await this.accessibleProjectIds(principal);
    const current = await this.prisma.chart.findFirst({ where: { organizationId: principal.organizationId, projectId: { in: projectIds }, id, deletedAt: null } });
    if (current) await this.authorization.assertProjectPermission(principal as never, current.projectId, 'write');
    const result = await this.prisma.chart.updateMany({ where: { organizationId: principal.organizationId, projectId: { in: projectIds }, id, deletedAt: null }, data: { deletedAt: new Date(), revision: { increment: 1 } } });
    if (!result.count) throw new ApiError(404, 'CHART_NOT_FOUND', 'Chart was not found.');
    return { success: true };
  }

  async attachChart(principal: RequestPrincipal, dashboardId: string, chartId: string) {
    const layoutItem = { id: `widget-${randomUUID()}`, organizationId: principal.organizationId, dashboardId, chartId, type: 'chart', x: 0, y: 0, width: 6, height: 4, zIndex: 0, revision: 0 };
    if (this.memory) { this.widgets.push(layoutItem); return { layoutItem }; }
    const projectIds = await this.accessibleProjectIds(principal);
    const dashboard = await this.prisma.biDashboard.findFirst({ where: { id: dashboardId, organizationId: principal.organizationId, projectId: { in: projectIds }, deletedAt: null } });
    const chart = await this.prisma.chart.findFirst({ where: { id: chartId, organizationId: principal.organizationId, projectId: { in: projectIds }, deletedAt: null } });
    if (!dashboard || !chart || dashboard.projectId !== chart.projectId) throw new ApiError(404, 'DASHBOARD_OR_CHART_NOT_FOUND', 'Dashboard or chart was not found.');
    await this.authorization.assertProjectPermission(principal as never, dashboard.projectId, 'write');
    const widget = await this.prisma.dashboardWidget.create({ data: layoutItem });
    return { layoutItem: widget };
  }
  async dashboardCharts(principal: RequestPrincipal, dashboardId: string) {
    if (!this.memory) {
      const projectIds = await this.accessibleProjectIds(principal);
      const dashboard = await this.prisma.biDashboard.findFirst({ where: { id: dashboardId, organizationId: principal.organizationId, projectId: { in: projectIds }, deletedAt: null }, select: { id: true, projectId: true } });
      if (!dashboard) throw new ApiError(404, 'DASHBOARD_NOT_FOUND', 'Dashboard was not found.');
    }
    const widgets = this.memory ? this.widgets.filter(item => item.organizationId === principal.organizationId && item.dashboardId === dashboardId) : await this.prisma.dashboardWidget.findMany({ where: { organizationId: principal.organizationId, dashboardId }, orderBy: [{ zIndex: 'asc' }, { id: 'asc' }] });
    const ids = widgets.map(item => item.chartId).filter((id): id is string => Boolean(id));
    if (this.memory) return ids.map(id => this.charts.find(item => item.id === id)).filter(Boolean);
    const charts = await this.prisma.chart.findMany({ where: { organizationId: principal.organizationId, id: { in: ids }, deletedAt: null } });
    const byId = new Map(charts.map(item => [item.id, mapChart(item)]));
    return ids.map(id => byId.get(id)).filter(Boolean);
  }
  async dashboardContext(principal: RequestPrincipal, dashboardId: string) {
    if (this.memory) return { project: null, sheet: null, dashboard: { id: dashboardId, layout: this.widgets.filter(item => item.dashboardId === dashboardId) } };
    const projectIds = await this.accessibleProjectIds(principal);
    const dashboard = await this.prisma.biDashboard.findFirst({ where: { organizationId: principal.organizationId, projectId: { in: projectIds }, id: dashboardId, deletedAt: null } });
    if (!dashboard) throw new ApiError(404, 'DASHBOARD_NOT_FOUND', 'Dashboard was not found.');
    const [project, sheet, layout] = await Promise.all([this.prisma.biProject.findFirst({ where: { id: dashboard.projectId, organizationId: principal.organizationId } }), dashboard.sheetId ? this.prisma.biSheet.findFirst({ where: { id: dashboard.sheetId } }) : null, this.prisma.dashboardWidget.findMany({ where: { dashboardId, organizationId: principal.organizationId } })]);
    return { project, sheet, dashboard: { ...dashboard, layout } };
  }

  async getDataset(principal: RequestPrincipal) {
    if (this.memory) throw new ApiError(404, 'DATASET_NOT_FOUND', 'Dataset was not found.');
    const projectIds = await this.accessibleProjectIds(principal);
    const dataset = await this.prisma.dataset.findFirst({ where: { organizationId: principal.organizationId, projectId: { in: projectIds }, deletedAt: null }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }] });
    if (!dataset) throw new ApiError(404, 'DATASET_NOT_FOUND', 'Dataset was not found.');
    const [fields, rows] = await Promise.all([this.prisma.datasetField.findMany({ where: { datasetId: dataset.id }, orderBy: { ordinal: 'asc' } }), this.prisma.datasetRow.findMany({ where: { datasetId: dataset.id }, orderBy: { rowNumber: 'asc' }, take: 50000 })]);
    return { ...dataset, schema: fields, rows: rows.map(item => item.rowJson) };
  }
  async getDatasetSchema(principal: RequestPrincipal) { return (await this.getDataset(principal)).schema; }
  async queryDataset(principal: RequestPrincipal, sql: string) {
    try { validateReadOnlySql(sql); } catch (error) { throw new ApiError(400, 'UNSAFE_QUERY', error instanceof Error ? error.message : 'Query is not allowed.'); }
    const dataset = await this.getDataset(principal);
    return { rows: dataset.rows, rowCount: dataset.rows.length, schema: dataset.schema };
  }
}

function optionalString(value: unknown) { const text = value == null ? '' : String(value); return text || null; }
function asJson(value: unknown) { return value === undefined ? undefined : value as never; }
function asJsonMap(value: unknown): JsonMap {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonMap : {};
}
function asJsonArray(value: unknown): unknown[] { return Array.isArray(value) ? value : []; }
function buildChartDataContract(payload: JsonMap, datasetId: string | null) {
  const supplied = asJsonMap(payload.dataContract);
  if (typeof supplied.sourceType === 'string') return supplied;
  const queryResult = asJsonMap(payload.queryResult);
  const schema = asJsonMap(payload.querySchema ?? payload.schema);
  const rows = asJsonArray(payload.rows).length ? asJsonArray(payload.rows) : asJsonArray(queryResult.rows);
  const fields = asJsonArray(schema.fields).length
    ? asJsonArray(schema.fields)
    : asJsonArray(queryResult.fields).length
      ? asJsonArray(queryResult.fields)
      : asJsonArray(payload.schema);
  if (String(payload.queryMode || '') === 'sql') {
    return { sourceType: 'sql-result', datasetId: null, rows, fields, queryText: String(payload.customSql || payload.lastExecutedSql || '') };
  }
  if (rows.length) return { sourceType: 'snapshot', datasetId: null, rows, fields };
  if (datasetId) return { sourceType: 'dataset', datasetId, rows: [], fields };
  return { sourceType: 'unavailable', datasetId: null, rows: [], fields };
}
function mapChart(item: JsonMap) {
  const config = asJsonMap(item.configJson);
  const storedChartType = optionalString(config.chartType || config.type || item.chartTypeId);
  const chartType = storedChartType?.replace(/^chart-type-/, '') || 'bar';
  return {
    ...item,
    title: item.name,
    mapping: item.mappingJson,
    settings: item.settingsJson,
    filters: item.filtersJson,
    config,
    dataContract: item.dataContractJson,
    datasetId: item.datasetId,
    dataset: item.datasetId,
    templateId: optionalString(config.templateId) || chartType,
    chartType,
  };
}
