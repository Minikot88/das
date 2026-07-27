import { createHash, randomUUID } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { ApiError } from '../../shared/http/api-error.js';
import { ensureRequestId } from '../../shared/http/request-id.js';
import type { RequestPrincipal } from '../projects/application/project.service.js';
import { createShareToken, hashShareToken } from './domain/share-token.js';
import { AuthorizationService } from '../auth/application/authorization.service.js';

type JsonObject = Record<string, unknown>;

@Injectable()
export class SharingService {
  constructor(private readonly prisma: PrismaService, private readonly authorization: AuthorizationService) {}

  private async accessibleDashboard(principal: RequestPrincipal, dashboardId: string) {
    const memberships = (await this.prisma.biProjectMember.findMany({ where: { organizationId: principal.organizationId, userId: principal.userId }, select: { projectId: true } })).map(item => item.projectId);
    const dashboard = await this.prisma.biDashboard.findFirst({ where: { id: dashboardId, organizationId: principal.organizationId, deletedAt: null, projectId: { in: (await this.prisma.biProject.findMany({ where: { organizationId: principal.organizationId, deletedAt: null, OR: [{ ownerUserId: principal.userId }, { id: { in: memberships } }] }, select: { id: true } })).map(item => item.id) } } });
    if (!dashboard) throw new ApiError(404, 'DASHBOARD_NOT_FOUND', 'Dashboard was not found.');
    return dashboard;
  }

  async create(principal: RequestPrincipal, input: JsonObject) {
    const dashboard = await this.accessibleDashboard(principal, String(input.dashboardId || ''));
    await this.authorization.assertProjectPermission(principal as never, dashboard.projectId, 'share');
    const expiresAt = input.expiresAt ? new Date(String(input.expiresAt)) : null;
    if (expiresAt && (!Number.isFinite(expiresAt.getTime()) || expiresAt <= new Date())) throw new ApiError(400, 'INVALID_EXPIRATION', 'Share expiration must be in the future.');
    const allowedOrigins = parseOrigins(input.allowedOrigins);
    const [project, sheet, widgets] = await Promise.all([
      this.prisma.biProject.findUnique({ where: { id: dashboard.projectId } }),
      dashboard.sheetId ? this.prisma.biSheet.findUnique({ where: { id: dashboard.sheetId } }) : null,
      this.prisma.dashboardWidget.findMany({ where: { dashboardId: dashboard.id, organizationId: principal.organizationId }, orderBy: [{ zIndex: 'asc' }, { id: 'asc' }] }),
    ]);
    const chartIds = widgets.map(item => item.chartId).filter((id): id is string => Boolean(id));
    const charts = chartIds.length ? await this.prisma.chart.findMany({ where: { id: { in: chartIds }, projectId: dashboard.projectId, organizationId: principal.organizationId, deletedAt: null } }) : [];
    const datasetIds = charts.map(item => item.datasetId).filter((id): id is string => Boolean(id));
    const [datasetFields, datasetRows] = datasetIds.length ? await Promise.all([
      this.prisma.datasetField.findMany({ where: { datasetId: { in: datasetIds } }, orderBy: { ordinal: 'asc' } }),
      this.prisma.datasetRow.findMany({ where: { datasetId: { in: datasetIds } }, orderBy: { rowNumber: 'asc' }, take: 50_000 }),
    ]) : [[], []];
    const fieldsByDataset = new Map<string, unknown[]>();
    const rowsByDataset = new Map<string, unknown[]>();
    for (const field of datasetFields) fieldsByDataset.set(field.datasetId, [...(fieldsByDataset.get(field.datasetId) || []), field]);
    for (const row of datasetRows) rowsByDataset.set(row.datasetId, [...(rowsByDataset.get(row.datasetId) || []), row.rowJson]);
    const chartById = new Map(charts.map(item => [item.id, toPublicSnapshotChart(item, fieldsByDataset, rowsByDataset)]));
    const snapshot = {
      dashboardId: dashboard.id,
      dashboardName: dashboard.name,
      dashboardRevision: dashboard.revision,
      projectId: dashboard.projectId,
      projectName: project?.name || 'Shared workspace',
      sheetId: dashboard.sheetId,
      sheetName: sheet?.name || 'Shared sheet',
      createdAt: new Date().toISOString(),
      layout: widgets.map(item => ({ i: item.id, id: item.id, chartId: item.chartId, type: item.type, x: item.x, y: item.y, w: item.width, h: item.height, zIndex: item.zIndex, config: item.configJson })),
      widgets: widgets.map(item => ({ id: item.id, chartId: item.chartId, type: item.type, x: item.x, y: item.y, w: item.width, h: item.height, zIndex: item.zIndex, config: item.configJson, chart: item.chartId ? chartById.get(item.chartId) || null : null })),
    };
    const token = createShareToken();
    const id = `share-${randomUUID()}`;
    const checksum = createHash('sha256').update(stableStringify(snapshot)).digest('hex');
    await this.prisma.$transaction([
      this.prisma.dashboardShareLink.create({ data: { id, organizationId: principal.organizationId, projectId: dashboard.projectId, dashboardId: dashboard.id, tokenHash: token.tokenHash, allowedOrigins: allowedOrigins as never, expiresAt } }),
      this.prisma.dashboardShareSnapshot.create({ data: { id: `share-snapshot-${randomUUID()}`, shareId: id, dashboardRevision: dashboard.revision, snapshotJson: snapshot as never, checksum } }),
    ]);
    return { id, token: token.rawToken, dashboardId: dashboard.id, projectId: dashboard.projectId, expiresAt, allowedOrigins, revision: 0 };
  }

  async revoke(principal: RequestPrincipal, id: string, revision: number) {
    const share = await this.prisma.dashboardShareLink.findFirst({ where: { id, organizationId: principal.organizationId } });
    if (!share) throw new ApiError(404, 'SHARE_NOT_FOUND', 'Share was not found.');
    await this.accessibleDashboard(principal, share.dashboardId);
    await this.authorization.assertProjectPermission(principal as never, share.projectId, 'share');
    if (!Number.isInteger(revision) || revision !== share.revision) throw new ApiError(409, 'REVISION_CONFLICT', 'Share has changed since it was loaded.', undefined, false, share.revision);
    return this.prisma.dashboardShareLink.update({ where: { id }, data: { status: 'revoked', revokedAt: new Date(), revision: { increment: 1 } }, select: { id: true, status: true, revokedAt: true, revision: true } });
  }

  async resolve(rawToken: string, request: FastifyRequest) {
    const requestId = ensureRequestId(request);
    const tokenHash = hashShareToken(String(rawToken || ''));
    const share = await this.prisma.dashboardShareLink.findUnique({ where: { tokenHash } });
    const origin = typeof request.headers.origin === 'string' ? request.headers.origin : null;
    let outcome = 'denied';
    try {
      if (!share || share.status !== 'active' || share.revokedAt) throw new ApiError(404, 'SHARE_NOT_FOUND', 'Share was not found.');
      if (share.expiresAt && share.expiresAt <= new Date()) throw new ApiError(410, 'SHARE_EXPIRED', 'Share has expired.');
      const allowedOrigins = Array.isArray(share.allowedOrigins) ? share.allowedOrigins.map(String) : [];
      if (origin && allowedOrigins.length && !allowedOrigins.includes(origin)) throw new ApiError(403, 'EMBED_ORIGIN_NOT_ALLOWED', 'Embed origin is not allowed.');
      const snapshot = await this.prisma.dashboardShareSnapshot.findUnique({ where: { shareId: share.id } });
      if (!snapshot) throw new ApiError(404, 'SHARE_SNAPSHOT_NOT_FOUND', 'Share snapshot was not found.');
      const checksum = createHash('sha256').update(stableStringify(snapshot.snapshotJson)).digest('hex');
      if (checksum !== snapshot.checksum) throw new ApiError(503, 'SHARE_SNAPSHOT_INVALID', 'Share snapshot is unavailable.', undefined, true);
      outcome = 'allowed';
      return { id: share.id, dashboardId: share.dashboardId, projectId: share.projectId, expiresAt: share.expiresAt, snapshot: snapshot.snapshotJson };
    } finally {
      if (share) await this.prisma.dashboardShareAccessLog.create({ data: { shareId: share.id, requestId, origin, userAgent: String(request.headers['user-agent'] || '').slice(0, 500) || null, outcome } });
    }
  }
}

function parseOrigins(value: unknown) { if (!Array.isArray(value)) return []; const origins = value.map(String).filter(Boolean).slice(0, 20); for (const origin of origins) { let url: URL; try { url = new URL(origin); } catch { throw new ApiError(400, 'INVALID_ORIGIN', 'Allowed embed origin is invalid.'); } if (!['https:', 'http:'].includes(url.protocol) || url.origin !== origin) throw new ApiError(400, 'INVALID_ORIGIN', 'Allowed embed origin must be an exact HTTP(S) origin.'); } return [...new Set(origins)]; }
function asObject(value: unknown): JsonObject { return value && typeof value === 'object' && !Array.isArray(value) ? value as JsonObject : {}; }
function toPublicSnapshotChart(chart: { id: string; name: string; engine: string; datasetId: string | null; mappingJson: unknown; settingsJson: unknown; filtersJson: unknown; configJson: unknown; dataContractJson: unknown }, fieldsByDataset: Map<string, unknown[]>, rowsByDataset: Map<string, unknown[]>) {
  const contract = asObject(chart.dataContractJson);
  const config = asObject(chart.configJson);
  const datasetId = chart.datasetId || (typeof contract.datasetId === 'string' ? contract.datasetId : null);
  const rows = Array.isArray(contract.rows) && contract.rows.length ? contract.rows : (datasetId ? rowsByDataset.get(datasetId) || [] : []);
  const fields = Array.isArray(contract.fields) && contract.fields.length ? contract.fields : (datasetId ? fieldsByDataset.get(datasetId) || [] : []);
  return {
    id: chart.id,
    name: chart.name,
    engine: chart.engine,
    datasetId,
    mappingJson: chart.mappingJson,
    settingsJson: chart.settingsJson,
    filtersJson: chart.filtersJson,
    configJson: config,
    dataContractJson: { ...contract, datasetId, rows, fields },
  };
}
function stableStringify(value: unknown): string { if (value instanceof Date) return JSON.stringify(value.toISOString()); if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`; if (value && typeof value === 'object') return `{${Object.entries(value as JsonObject).filter(([,item]) => item !== undefined).sort(([left],[right]) => left.localeCompare(right)).map(([key,item]) => `${JSON.stringify(key)}:${stableStringify(item)}`).join(',')}}`; return JSON.stringify(value) ?? 'null'; }
