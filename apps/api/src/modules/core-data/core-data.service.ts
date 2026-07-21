import { createHash, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { parse } from 'csv-parse';
import type { MultipartFile } from '@fastify/multipart';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { ApiError } from '../../shared/http/api-error.js';
import type { RequestPrincipal } from '../projects/application/project.service.js';

type JsonObject = Record<string, unknown>;
type QueryFilter = { field: string; operator: string; value?: unknown };
type Aggregate = { field: string; operation: string; alias?: string };

@Injectable()
export class CoreDataService {
  constructor(private readonly prisma: PrismaService) {}

  private async project(principal: RequestPrincipal, projectId: string) {
    const project = await this.prisma.biProject.findFirst({
      where: {
        id: projectId,
        organizationId: principal.organizationId,
        deletedAt: null,
        OR: [{ ownerUserId: principal.userId }, { id: { in: (await this.prisma.biProjectMember.findMany({ where: { organizationId: principal.organizationId, userId: principal.userId }, select: { projectId: true } })).map(item => item.projectId) } }],
      },
    });
    if (!project) throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project was not found.');
    return project;
  }

  async listDatasets(principal: RequestPrincipal, projectId: string, page = 1, pageSize = 50) {
    await this.project(principal, projectId);
    const take = bounded(pageSize, 1, 200);
    const skip = (bounded(page, 1, 1_000_000) - 1) * take;
    const where = { organizationId: principal.organizationId, projectId, deletedAt: null };
    const [items, total] = await Promise.all([
      this.prisma.dataset.findMany({ where, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }], skip, take }),
      this.prisma.dataset.count({ where }),
    ]);
    return { items, total, page: Math.floor(skip / take) + 1, pageSize: take };
  }

  async dataset(principal: RequestPrincipal, id: string) {
    const item = await this.prisma.dataset.findFirst({ where: { id, organizationId: principal.organizationId, deletedAt: null } });
    if (!item) throw new ApiError(404, 'DATASET_NOT_FOUND', 'Dataset was not found.');
    await this.project(principal, item.projectId);
    return item;
  }

  async fields(principal: RequestPrincipal, id: string) {
    await this.dataset(principal, id);
    return this.prisma.datasetField.findMany({ where: { datasetId: id }, orderBy: [{ ordinal: 'asc' }, { id: 'asc' }] });
  }

  async importCsv(principal: RequestPrincipal, file: MultipartFile, input: { projectId: string; name?: string; idempotencyKey?: string }) {
    const filename = safeFilename(file.filename);
    if (!filename.toLowerCase().endsWith('.csv')) throw new ApiError(415, 'INVALID_FILE_TYPE', 'Only CSV files are allowed.');
    const allowedMime = new Set(['text/csv', 'application/csv', 'application/vnd.ms-excel', 'text/plain', 'application/octet-stream']);
    if (!allowedMime.has(String(file.mimetype || '').toLowerCase())) throw new ApiError(415, 'INVALID_FILE_TYPE', 'Only CSV files are allowed.');
    const projectId = String(input.projectId || '');
    await this.project(principal, projectId);
    const idempotencyKey = String(input.idempotencyKey || `upload-${randomUUID()}`).slice(0, 128);
    const existing = await this.prisma.importJob.findUnique({ where: { organizationId_idempotencyKey: { organizationId: principal.organizationId, idempotencyKey } } });
    if (existing) return { importJob: existing, duplicate: true };

    const datasetId = `dataset-${randomUUID()}`;
    const importId = `import-${randomUUID()}`;
    await this.prisma.$transaction([
      this.prisma.dataset.create({ data: { id: datasetId, organizationId: principal.organizationId, projectId, name: String(input.name || filename.replace(/\.csv$/i, '') || 'Imported dataset').slice(0, 180), sourceType: 'csv', status: 'processing' } }),
      this.prisma.importJob.create({ data: { id: importId, organizationId: principal.organizationId, projectId, datasetId, idempotencyKey, status: 'processing' } }),
    ]);

    let headers: string[] = [];
    let rowNumber = 0;
    const batch: Array<{ datasetId: string; rowNumber: number; rowJson: JsonObject }> = [];
    try {
      const parser = file.file.pipe(parse({ bom: true, columns: header => {
        headers = header.map((value: unknown, index: number) => normalizeHeader(String(value ?? ''), index));
        if (!headers.length || headers.length > 200) throw new Error('CSV must contain between 1 and 200 columns.');
        if (new Set(headers).size !== headers.length) throw new Error('CSV headers must be unique.');
        return headers;
      }, skip_empty_lines: true, relax_column_count: false, trim: false }));

      await this.prisma.$transaction(async tx => {
        for await (const raw of parser) {
          rowNumber += 1;
          if (rowNumber > 50_000) throw new Error('CSV exceeds the 50,000 row limit.');
          const row = Object.fromEntries(headers.map(key => [key, normalizeCsvValue((raw as JsonObject)[key])]));
          batch.push({ datasetId, rowNumber, rowJson: row });
          if (batch.length >= 1000) { await tx.datasetRow.createMany({ data: batch.splice(0) as never }); }
        }
        if (batch.length) await tx.datasetRow.createMany({ data: batch.splice(0) as never });
        if (!headers.length) throw new Error('CSV header is required.');
        const sample = await tx.datasetRow.findMany({ where: { datasetId }, orderBy: { rowNumber: 'asc' }, take: 200 });
        const fields = headers.map((name, ordinal) => ({ id: `field-${randomUUID()}`, datasetId, fieldKey: name, name, dataType: inferType(sample.map(item => (item.rowJson as JsonObject)[name])), nullable: sample.some(item => (item.rowJson as JsonObject)[name] == null), ordinal }));
        await tx.datasetField.createMany({ data: fields });
        await tx.datasetVersion.create({ data: { id: `dataset-version-${randomUUID()}`, datasetId, version: 1, schemaJson: fields as never, rowCount: rowNumber } });
        await tx.dataset.update({ where: { id: datasetId }, data: { status: 'ready', rowCount: rowNumber, fieldCount: headers.length, revision: { increment: 1 } } });
        await tx.importJob.update({ where: { id: importId }, data: { status: 'ready', processedRows: rowNumber, totalRows: rowNumber, completedAt: new Date() } });
      }, { timeout: 120_000 });
      return { dataset: await this.dataset(principal, datasetId), importJob: await this.prisma.importJob.findUnique({ where: { id: importId } }), duplicate: false };
    } catch (error) {
      await this.prisma.$transaction([
        this.prisma.dataset.update({ where: { id: datasetId }, data: { status: 'failed' } }),
        this.prisma.importJob.update({ where: { id: importId }, data: { status: 'failed', processedRows: rowNumber, totalRows: rowNumber, completedAt: new Date() } }),
        this.prisma.importError.create({ data: { importId, code: 'CSV_IMPORT_FAILED', message: safeImportMessage(error) } }),
      ]);
      throw new ApiError(400, 'CSV_IMPORT_FAILED', safeImportMessage(error));
    }
  }

  async queryDataset(principal: RequestPrincipal, id: string, input: JsonObject) {
    const dataset = await this.dataset(principal, id);
    if (dataset.status !== 'ready') throw new ApiError(409, 'DATASET_NOT_READY', 'Dataset is not ready for queries.');
    const fields = await this.fields(principal, id);
    const allowed = new Set(fields.map(field => field.fieldKey));
    const selected = Array.isArray(input.select) && input.select.length ? input.select.map(String) : [...allowed];
    selected.forEach(field => assertField(allowed, field));
    const filters = Array.isArray(input.filters) ? input.filters as QueryFilter[] : [];
    filters.forEach(filter => { assertField(allowed, String(filter.field)); assertOperator(String(filter.operator)); });
    const groupBy = Array.isArray(input.groupBy) ? input.groupBy.map(String) : [];
    groupBy.forEach(field => assertField(allowed, field));
    const aggregates = Array.isArray(input.aggregates) ? input.aggregates as Aggregate[] : [];
    aggregates.forEach(item => { assertField(allowed, String(item.field)); assertAggregate(String(item.operation)); });
    const sort = input.sort && typeof input.sort === 'object' ? input.sort as { field?: unknown; direction?: unknown } : undefined;
    if (sort?.field) assertField(allowed, String(sort.field));
    if (sort?.direction && !['asc', 'desc'].includes(String(sort.direction).toLowerCase())) throw new ApiError(400, 'UNKNOWN_SORT_DIRECTION', 'Unknown sort direction.');

    const source = await this.prisma.datasetRow.findMany({ where: { datasetId: id }, orderBy: { rowNumber: 'asc' }, take: 50_000 });
    let rows = source.map(item => item.rowJson as JsonObject).filter(row => filters.every(filter => matches(row[String(filter.field)], String(filter.operator), filter.value)));
    if (sort?.field) rows.sort((a, b) => compare(a[String(sort.field)], b[String(sort.field)]) * (String(sort.direction).toLowerCase() === 'desc' ? -1 : 1));
    if (groupBy.length || aggregates.length) rows = aggregateRows(rows, groupBy, aggregates);
    else rows = rows.map(row => Object.fromEntries(selected.map(field => [field, row[field]])));
    const total = rows.length;
    const pageSize = bounded(Number(input.pageSize || input.limit || 100), 1, 5000);
    const page = bounded(Number(input.page || 1), 1, 1_000_000);
    rows = rows.slice((page - 1) * pageSize, page * pageSize);
    return { rows, total, page, pageSize, truncated: total > page * pageSize };
  }

  async listDashboards(principal: RequestPrincipal, projectId: string) {
    await this.project(principal, projectId);
    return this.prisma.biDashboard.findMany({ where: { organizationId: principal.organizationId, projectId, deletedAt: null }, orderBy: [{ updatedAt: 'desc' }, { id: 'asc' }] });
  }

  async dashboard(principal: RequestPrincipal, id: string) {
    const item = await this.prisma.biDashboard.findFirst({ where: { id, organizationId: principal.organizationId, deletedAt: null } });
    if (!item) throw new ApiError(404, 'DASHBOARD_NOT_FOUND', 'Dashboard was not found.');
    await this.project(principal, item.projectId);
    const widgets = await this.prisma.dashboardWidget.findMany({ where: { dashboardId: id, organizationId: principal.organizationId }, orderBy: [{ zIndex: 'asc' }, { id: 'asc' }] });
    return { ...item, widgets };
  }

  async createDashboard(principal: RequestPrincipal, input: JsonObject) {
    const projectId = String(input.projectId || '');
    await this.project(principal, projectId);
    return this.prisma.biDashboard.create({ data: { id: String(input.id || `dashboard-${randomUUID()}`), organizationId: principal.organizationId, projectId, sheetId: optionalString(input.sheetId), name: requiredName(input.name, 'Dashboard'), canvasSettingsJson: asJson(input.canvasSettings), status: String(input.status || 'draft') } });
  }

  async updateDashboard(principal: RequestPrincipal, id: string, input: JsonObject) {
    const current = await this.dashboard(principal, id);
    const revision = Number(input.revision);
    if (!Number.isInteger(revision) || revision !== current.revision) throw new ApiError(409, 'REVISION_CONFLICT', 'Dashboard has changed since it was loaded.', undefined, false, current.revision);
    return this.prisma.biDashboard.update({ where: { id }, data: { name: input.name === undefined ? current.name : requiredName(input.name, 'Dashboard'), canvasSettingsJson: input.canvasSettings === undefined ? undefined : asJson(input.canvasSettings), status: input.status === undefined ? current.status : String(input.status), revision: { increment: 1 } } });
  }

  async saveWidgets(principal: RequestPrincipal, dashboardId: string, input: JsonObject) {
    const dashboard = await this.dashboard(principal, dashboardId);
    const revision = Number(input.revision);
    if (!Number.isInteger(revision) || revision !== dashboard.revision) throw new ApiError(409, 'REVISION_CONFLICT', 'Dashboard has changed since it was loaded.', undefined, false, dashboard.revision);
    const widgets = Array.isArray(input.widgets) ? input.widgets as JsonObject[] : [];
    const chartIds = widgets.map(item => optionalString(item.chartId)).filter((value): value is string => Boolean(value));
    const charts = chartIds.length ? await this.prisma.chart.findMany({ where: { id: { in: chartIds }, organizationId: principal.organizationId, projectId: dashboard.projectId, deletedAt: null }, select: { id: true } }) : [];
    if (new Set(charts.map(item => item.id)).size !== new Set(chartIds).size) throw new ApiError(400, 'CROSS_PROJECT_REFERENCE', 'A widget references a chart outside the dashboard project.');
    await this.prisma.$transaction(async tx => {
      await tx.dashboardWidget.deleteMany({ where: { dashboardId, organizationId: principal.organizationId } });
      if (widgets.length) await tx.dashboardWidget.createMany({ data: widgets.map((item, index) => ({ id: String(item.id || `widget-${randomUUID()}`), organizationId: principal.organizationId, dashboardId, chartId: optionalString(item.chartId), type: String(item.type || 'chart'), x: integer(item.x, 0), y: integer(item.y, 0), width: integer(item.width ?? item.w, 6), height: integer(item.height ?? item.h, 4), zIndex: integer(item.zIndex, index), configJson: asJson(item.config), revision: 0 })) });
      await tx.biDashboard.update({ where: { id: dashboardId }, data: { revision: { increment: 1 } } });
    });
    return this.dashboard(principal, dashboardId);
  }

  async importWorkspace(principal: RequestPrincipal, input: JsonObject) {
    if (input.schemaVersion !== 1 || !Array.isArray(input.projects)) throw new ApiError(400, 'INVALID_WORKSPACE', 'Workspace schema version 1 is required.');
    const secretPaths = findSecretPaths(input);
    if (secretPaths.length) throw new ApiError(400, 'WORKSPACE_CONTAINS_SECRETS', 'Workspace contains plain secret material.', { workspace: secretPaths.slice(0, 5).join(', ') });
    const serialized = JSON.stringify(input);
    if (Buffer.byteLength(serialized) > 25 * 1024 * 1024) throw new ApiError(413, 'WORKSPACE_TOO_LARGE', 'Workspace import exceeds the 25 MB limit.');
    const fingerprint = createHash('sha256').update(serialized).digest('hex');
    const prior = await this.prisma.auditLog.findFirst({ where: { organizationId: principal.organizationId, actorUserId: principal.userId, action: 'workspace.import', metadataJson: { path: ['fingerprint'], equals: fingerprint } } });
    if (prior) return { duplicate: true, fingerprint, importedAt: prior.occurredAt, mapping: (prior.metadataJson as JsonObject | null)?.mapping || {} };

    const projects = input.projects as JsonObject[];
    if (projects.length > 100) throw new ApiError(400, 'WORKSPACE_LIMIT_EXCEEDED', 'Workspace contains too many projects.');
    const mapping = { projects: {} as Record<string,string>, datasets: {} as Record<string,string>, charts: {} as Record<string,string>, dashboards: {} as Record<string,string>, widgets: {} as Record<string,string> };
    await this.prisma.$transaction(async tx => {
      for (const projectInput of projects) {
        const sourceProjectId = String(projectInput.id || '');
        if (!sourceProjectId) throw new ApiError(400, 'INVALID_WORKSPACE', 'Every project must have an id.');
        const existingProjectId = await tx.biProject.findUnique({ where: { id: sourceProjectId }, select: { id: true } });
        const projectId = existingProjectId ? `project-${randomUUID()}` : sourceProjectId.slice(0, 64);
        mapping.projects[sourceProjectId] = projectId;
        const baseName = String(projectInput.name || 'Imported project').slice(0, 150);
        const nameTaken = await tx.biProject.findFirst({ where: { organizationId: principal.organizationId, name: baseName, deletedAt: null }, select: { id: true } });
        const projectName = nameTaken ? `${baseName} (Imported ${projectId.slice(-6)})`.slice(0, 180) : baseName;
        await tx.biProject.create({ data: { id: projectId, organizationId: principal.organizationId, ownerUserId: principal.userId, name: projectName } });

        const datasets = Array.isArray(projectInput.datasets) ? projectInput.datasets as JsonObject[] : [];
        for (const datasetInput of datasets) {
          const sourceId = String(datasetInput.id || '');
          const rows = Array.isArray(datasetInput.rows) ? datasetInput.rows as JsonObject[] : [];
          const fields = Array.isArray(datasetInput.fields) ? datasetInput.fields as JsonObject[] : [];
          if (!sourceId || rows.length > 50_000 || fields.length > 200) throw new ApiError(400, 'WORKSPACE_LIMIT_EXCEEDED', 'A dataset exceeds import limits.');
          const id = await tx.dataset.findUnique({ where: { id: sourceId }, select: { id: true } }) ? `dataset-${randomUUID()}` : sourceId.slice(0, 64);
          mapping.datasets[sourceId] = id;
          await tx.dataset.create({ data: { id, organizationId: principal.organizationId, projectId, name: String(datasetInput.name || 'Imported dataset').slice(0, 180), sourceType: 'local-workspace', status: 'processing' } });
          if (fields.length) await tx.datasetField.createMany({ data: fields.map((field, ordinal) => ({ id: `field-${randomUUID()}`, datasetId: id, fieldKey: String(field.fieldKey || field.key || field.name || `column_${ordinal + 1}`).slice(0, 191), name: String(field.name || field.label || field.key || `Column ${ordinal + 1}`).slice(0, 191), label: field.label ? String(field.label).slice(0, 191) : null, dataType: String(field.dataType || field.type || 'string').slice(0, 40), nullable: field.nullable !== false, ordinal })) });
          for (let offset = 0; offset < rows.length; offset += 1000) await tx.datasetRow.createMany({ data: rows.slice(offset, offset + 1000).map((row, index) => ({ datasetId: id, rowNumber: offset + index + 1, rowJson: row as never })) });
          await tx.dataset.update({ where: { id }, data: { status: 'ready', rowCount: rows.length, fieldCount: fields.length, revision: { increment: 1 } } });
          await tx.datasetVersion.create({ data: { id: `dataset-version-${randomUUID()}`, datasetId: id, version: 1, schemaJson: fields as never, rowCount: rows.length } });
        }

        const charts = Array.isArray(projectInput.charts) ? projectInput.charts as JsonObject[] : [];
        for (const chartInput of charts) {
          const sourceId = String(chartInput.id || '');
          if (!sourceId) throw new ApiError(400, 'INVALID_WORKSPACE', 'Every chart must have an id.');
          const id = await tx.chart.findUnique({ where: { id: sourceId }, select: { id: true } }) ? `chart-${randomUUID()}` : sourceId.slice(0, 64);
          mapping.charts[sourceId] = id;
          const datasetId = chartInput.datasetId ? mapping.datasets[String(chartInput.datasetId)] : null;
          if (chartInput.datasetId && !datasetId) throw new ApiError(400, 'CROSS_PROJECT_REFERENCE', 'Chart references a dataset outside its imported project.');
          await tx.chart.create({ data: { id, organizationId: principal.organizationId, projectId, datasetId, name: String(chartInput.name || chartInput.title || 'Imported chart').slice(0, 180), engine: String(chartInput.engine || 'chartjs').slice(0, 40), mappingJson: asJson(chartInput.mapping), settingsJson: asJson(chartInput.settings), filtersJson: asJson(chartInput.filters), configJson: asJson(chartInput.config), dataContractJson: asJson(chartInput.dataContract) } });
        }

        const dashboards = Array.isArray(projectInput.dashboards) ? projectInput.dashboards as JsonObject[] : [];
        for (const dashboardInput of dashboards) {
          const sourceId = String(dashboardInput.id || '');
          if (!sourceId) throw new ApiError(400, 'INVALID_WORKSPACE', 'Every dashboard must have an id.');
          const id = await tx.biDashboard.findUnique({ where: { id: sourceId }, select: { id: true } }) ? `dashboard-${randomUUID()}` : sourceId.slice(0, 64);
          mapping.dashboards[sourceId] = id;
          await tx.biDashboard.create({ data: { id, organizationId: principal.organizationId, projectId, name: String(dashboardInput.name || 'Imported dashboard').slice(0, 180), canvasSettingsJson: asJson(dashboardInput.canvasSettings) } });
          const widgets = Array.isArray(dashboardInput.widgets) ? dashboardInput.widgets as JsonObject[] : [];
          for (const [index, widget] of widgets.entries()) {
            const sourceWidgetId = String(widget.id || `widget-${index + 1}`);
            const widgetId = await tx.dashboardWidget.findUnique({ where: { id: sourceWidgetId }, select: { id: true } }) ? `widget-${randomUUID()}` : sourceWidgetId.slice(0, 64);
            mapping.widgets[`${sourceId}:${sourceWidgetId}`] = widgetId;
            const chartId = widget.chartId ? mapping.charts[String(widget.chartId)] : null;
            if (widget.chartId && !chartId) throw new ApiError(400, 'CROSS_PROJECT_REFERENCE', 'Widget references a chart outside its imported project.');
            const layout = widget.layout && typeof widget.layout === 'object' ? widget.layout as JsonObject : widget;
            await tx.dashboardWidget.create({ data: { id: widgetId, organizationId: principal.organizationId, dashboardId: id, chartId, type: String(widget.kind || widget.type || (chartId ? 'chart' : 'text')).slice(0, 40), x: integer(layout.x, 0), y: integer(layout.y, 0), width: integer(layout.w ?? layout.width, 6), height: integer(layout.h ?? layout.height, 4), zIndex: integer(layout.zIndex, index), configJson: asJson(widget.presentation || widget.config) } });
          }
        }
      }
      await tx.auditLog.create({ data: { organizationId: principal.organizationId, actorUserId: principal.userId, requestId: `workspace-import-${randomUUID()}`, action: 'workspace.import', outcome: 'succeeded', metadataJson: { fingerprint, mapping } } });
    }, { timeout: 120_000 });
    return { duplicate: false, fingerprint, mapping };
  }

  async preferences(principal: RequestPrincipal) {
    return this.prisma.userPreference.upsert({ where: { organizationId_userId: { organizationId: principal.organizationId, userId: principal.userId } }, create: { id: `preference-${randomUUID()}`, organizationId: principal.organizationId, userId: principal.userId }, update: {} });
  }

  async updatePreferences(principal: RequestPrincipal, input: JsonObject) {
    const current = await this.preferences(principal);
    const revision = Number(input.revision);
    if (!Number.isInteger(revision) || revision !== current.revision) throw new ApiError(409, 'REVISION_CONFLICT', 'Preferences have changed since they were loaded.', undefined, false, current.revision);
    return this.prisma.userPreference.update({ where: { id: current.id }, data: { locale: input.locale === undefined ? undefined : String(input.locale), theme: input.theme === undefined ? undefined : String(input.theme), density: input.density === undefined ? undefined : String(input.density), dateFormat: input.dateFormat === undefined ? undefined : String(input.dateFormat), numberFormat: input.numberFormat === undefined ? undefined : String(input.numberFormat), preferencesJson: input.preferences === undefined ? undefined : asJson(input.preferences), revision: { increment: 1 } } });
  }
}

function safeFilename(value: string) { const name = String(value || '').replaceAll('\\', '/').split('/').pop() || ''; if (!name || name.includes('\0')) throw new ApiError(400, 'INVALID_FILENAME', 'Filename is invalid.'); return name.replace(/[^\p{L}\p{N}._ -]/gu, '_').slice(0, 255); }
function normalizeHeader(value: string, index: number) { const text = value.replace(/^\uFEFF/, '').trim(); return (text || `column_${index + 1}`).slice(0, 191); }
function normalizeCsvValue(value: unknown): unknown { const text = value == null ? '' : String(value); if (!text.trim()) return null; return /^[=+\-@]/.test(text) ? `'${text}` : text; }
function inferType(values: unknown[]) { const clean = values.filter(value => value != null).map(String); if (!clean.length) return 'string'; if (clean.every(value => /^(true|false)$/i.test(value))) return 'boolean'; if (clean.every(value => /^-?(?:\d+|\d*\.\d+)$/.test(value))) return 'number'; if (clean.every(value => !Number.isNaN(Date.parse(value)) && /[-/:T]/.test(value))) return 'date'; return 'string'; }
function safeImportMessage(error: unknown) { const text = error instanceof Error ? error.message : 'CSV import failed.'; return /column|header|row|record|csv|encoding|limit/i.test(text) ? text.slice(0, 500) : 'CSV import failed.'; }
function bounded(value: number, min: number, max: number) { const parsed = Number.isFinite(value) ? Math.trunc(value) : min; return Math.min(max, Math.max(min, parsed)); }
function optionalString(value: unknown) { const text = value == null ? '' : String(value); return text || null; }
function requiredName(value: unknown, label: string) { const text = String(value || '').trim(); if (!text) throw new ApiError(400, 'VALIDATION_ERROR', `${label} name is required.`); return text.slice(0, 180); }
function asJson(value: unknown) { return value === undefined ? undefined : value as never; }
function integer(value: unknown, fallback: number) { const parsed = Number(value); return Number.isInteger(parsed) ? parsed : fallback; }
function assertField(allowed: Set<string>, field: string) { if (!allowed.has(field)) throw new ApiError(400, 'UNKNOWN_FIELD', `Unknown dataset field: ${field}`); }
function assertOperator(operator: string) { if (!['eq','neq','contains','starts_with','ends_with','gt','gte','lt','lte','is_null','not_null','in'].includes(operator)) throw new ApiError(400, 'UNKNOWN_OPERATOR', `Unknown filter operator: ${operator}`); }
function assertAggregate(operation: string) { if (!['count','sum','average','min','max'].includes(operation)) throw new ApiError(400, 'UNKNOWN_AGGREGATE', `Unknown aggregate: ${operation}`); }
function matches(actual: unknown, operator: string, expected: unknown) { if (operator === 'is_null') return actual == null; if (operator === 'not_null') return actual != null; if (operator === 'in') return Array.isArray(expected) && expected.some(value => compare(actual, value) === 0); const comparison = compare(actual, expected); if (operator === 'eq') return comparison === 0; if (operator === 'neq') return comparison !== 0; if (operator === 'gt') return comparison > 0; if (operator === 'gte') return comparison >= 0; if (operator === 'lt') return comparison < 0; if (operator === 'lte') return comparison <= 0; const left = String(actual ?? '').toLocaleLowerCase(); const right = String(expected ?? '').toLocaleLowerCase(); if (operator === 'contains') return left.includes(right); if (operator === 'starts_with') return left.startsWith(right); if (operator === 'ends_with') return left.endsWith(right); return false; }
function compare(left: unknown, right: unknown) { if (left == null && right == null) return 0; if (left == null) return -1; if (right == null) return 1; const leftNumber = Number(left); const rightNumber = Number(right); if (Number.isFinite(leftNumber) && Number.isFinite(rightNumber)) return leftNumber - rightNumber; return String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' }); }
function aggregateRows(rows: JsonObject[], groupBy: string[], aggregates: Aggregate[]) { const groups = new Map<string, JsonObject[]>(); for (const row of rows) { const key = JSON.stringify(groupBy.map(field => row[field])); const items = groups.get(key) || []; items.push(row); groups.set(key, items); } return [...groups.values()].map(items => { const output: JsonObject = Object.fromEntries(groupBy.map(field => [field, items[0]?.[field]])); for (const item of aggregates) { const key = item.alias || `${item.operation}_${item.field}`; const values = items.map(row => Number(row[item.field])).filter(Number.isFinite); if (item.operation === 'count') output[key] = items.filter(row => row[item.field] != null).length; if (item.operation === 'sum') output[key] = values.reduce((sum, value) => sum + value, 0); if (item.operation === 'average') output[key] = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : null; if (item.operation === 'min') output[key] = values.length ? Math.min(...values) : null; if (item.operation === 'max') output[key] = values.length ? Math.max(...values) : null; } return output; }); }
function findSecretPaths(value: unknown) { const findings: string[] = []; const secretKeys = new Set(['password','passwd','passphrase','token','accesstoken','refreshtoken','apikey','secret','secretkey','privatekey','clientsecret','connectionstring','credentials']); const visit = (current: unknown, path: string, opaqueRows = false) => { if (Array.isArray(current)) return current.forEach((item, index) => visit(item, `${path}[${index}]`, opaqueRows || /\.rows$/.test(path))); if (!current || typeof current !== 'object') return; for (const [key,item] of Object.entries(current as JsonObject)) { const normalized = key.toLowerCase().replace(/[^a-z0-9]/g, ''); const nextPath = path ? `${path}.${key}` : key; if (!opaqueRows && secretKeys.has(normalized) && item != null && item !== '' && item !== false) findings.push(nextPath); if (!opaqueRows && typeof item === 'string' && /:\/\/[^/@\s]+:[^/@\s]+@/.test(item)) findings.push(`${nextPath} URL credentials`); visit(item, nextPath, opaqueRows); } }; visit(value, ''); return findings; }
