import { createHash, randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { Inject, Injectable } from '@nestjs/common';
import type { RuntimeEnvironment } from '../../app/config/environment.js';
import { ENVIRONMENT } from '../../app/config/token.js';
import { PrismaService } from '../../infrastructure/database/prisma.service.js';
import { ApiError } from '../../shared/http/api-error.js';
import type { RequestPrincipal } from '../projects/application/project.service.js';
import { AuthorizationService } from '../auth/application/authorization.service.js';
import { ExternalSourcesService } from '../external-sources/external-sources.service.js';

type JsonObject = Record<string, unknown>;

@Injectable()
export class ExportsService {
  private readonly root: string;
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(ENVIRONMENT) environment: RuntimeEnvironment,
    @Inject(AuthorizationService) private readonly authorization: AuthorizationService,
    @Inject(ExternalSourcesService) private readonly external: ExternalSourcesService,
  ) { this.root = resolve(dirname(environment.fileStoragePath), 'exports'); }

  private async project(principal: RequestPrincipal, projectId: string) {
    await this.authorization.assertProjectPermission(principal as never, projectId, 'export');
    const memberIds = (await this.prisma.biProjectMember.findMany({ where: { organizationId: principal.organizationId, userId: principal.userId }, select: { projectId: true } })).map(item => item.projectId);
    const project = await this.prisma.biProject.findFirst({ where: { id: projectId, organizationId: principal.organizationId, deletedAt: null, OR: [{ ownerUserId: principal.userId }, { id: { in: memberIds } }] } });
    if (!project) throw new ApiError(404, 'PROJECT_NOT_FOUND', 'Project was not found.');
    return project;
  }

  async create(principal: RequestPrincipal, input: JsonObject) {
    const projectId = String(input.projectId || '');
    await this.project(principal, projectId);
    const entityType = String(input.entityType || 'dashboard');
    const entityId = String(input.entityId || '');
    const format = String(input.format || (entityType === 'dataset' ? 'csv' : 'json')).toLowerCase();
    if (!['dashboard', 'dataset'].includes(entityType) || !['json', 'csv'].includes(format) || (entityType === 'dashboard' && format !== 'json')) throw new ApiError(400, 'EXPORT_FORMAT_NOT_SUPPORTED', 'Export format is not supported.');
    let bytes: Buffer;
    let baseName: string;
    let mimeType: string;
    if (entityType === 'dashboard') {
      const dashboard = await this.prisma.biDashboard.findFirst({ where: { id: entityId, projectId, organizationId: principal.organizationId, deletedAt: null } });
      if (!dashboard) throw new ApiError(404, 'DASHBOARD_NOT_FOUND', 'Dashboard was not found.');
      const widgets = await this.prisma.dashboardWidget.findMany({ where: { dashboardId: entityId, organizationId: principal.organizationId }, orderBy: [{ zIndex: 'asc' }, { id: 'asc' }] });
      bytes = Buffer.from(JSON.stringify({ dashboard, widgets }, bigintJsonReplacer, 2), 'utf8'); baseName = dashboard.name; mimeType = 'application/json';
    } else {
      const dataset = await this.prisma.dataset.findFirst({ where: { id: entityId, projectId, organizationId: principal.organizationId, status: 'ready', deletedAt: null } });
      if (!dataset) throw new ApiError(404, 'DATASET_NOT_FOUND', 'Dataset was not found.');
      const [fields, storedRows] = await Promise.all([this.prisma.datasetField.findMany({ where: { datasetId: entityId }, orderBy: { ordinal: 'asc' } }), this.prisma.datasetRow.findMany({ where: { datasetId: entityId }, orderBy: { rowNumber: 'asc' }, take: 50_000 })]);
      const rows = dataset.sourceType === 'postgres_schema' && dataset.sourceConfigJson
        ? (await this.external.run({ ...(dataset.sourceConfigJson as JsonObject), page: 1, pageSize: 10_000 })).rows.map(rowJson => ({ rowJson }))
        : storedRows;
      const keys = fields.map(field => field.fieldKey);
      const csv = [keys.map(csvCell).join(','), ...rows.map(item => keys.map(key => csvCell((item.rowJson as JsonObject)[key])).join(','))].join('\r\n');
      bytes = Buffer.from(`\uFEFF${csv}`, 'utf8'); baseName = dataset.name; mimeType = 'text/csv; charset=utf-8';
    }
    const exportId = `export-${randomUUID()}`;
    const fileId = `file-${randomUUID()}`;
    const storageKey = `${randomUUID()}.${format}`;
    const filename = `${sanitizeName(baseName)}.${format}`;
    const path = resolve(this.root, storageKey);
    if (!path.startsWith(`${this.root}\\`) && !path.startsWith(`${this.root}/`)) throw new ApiError(500, 'EXPORT_STORAGE_ERROR', 'Export storage is unavailable.', undefined, true);
    await mkdir(this.root, { recursive: true });
    await writeFile(path, bytes, { flag: 'wx', mode: 0o600 });
    const checksum = createHash('sha256').update(bytes).digest('hex');
    const retentionUntil = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    try {
      await this.prisma.$transaction([
        this.prisma.exportJob.create({ data: { id: exportId, organizationId: principal.organizationId, projectId, requestedBy: principal.userId, entityType, entityId, format, status: 'ready', optionsJson: input.options as never, completedAt: new Date() } }),
        this.prisma.fileRecord.create({ data: { id: fileId, organizationId: principal.organizationId, projectId, ownerUserId: principal.userId, provider: 'local-private', storageKey, filename, mimeType, sizeBytes: BigInt(bytes.length), checksum, retentionUntil } }),
        this.prisma.exportFile.create({ data: { id: `export-file-${randomUUID()}`, exportId, fileId } }),
      ]);
    } catch { await unlink(path).catch(() => undefined); throw new ApiError(500, 'EXPORT_PERSISTENCE_FAILED', 'Export could not be persisted.', undefined, true); }
    return { id: exportId, status: 'ready', filename, mimeType, sizeBytes: bytes.length, checksum, expiresAt: retentionUntil };
  }

  async file(principal: RequestPrincipal, exportId: string) {
    const job = await this.prisma.exportJob.findFirst({ where: { id: exportId, organizationId: principal.organizationId } });
    if (!job) throw new ApiError(404, 'EXPORT_NOT_FOUND', 'Export was not found.');
    await this.project(principal, job.projectId);
    const link = await this.prisma.exportFile.findFirst({ where: { exportId } });
    const file = link ? await this.prisma.fileRecord.findUnique({ where: { id: link.fileId } }) : null;
    if (!file || (file.retentionUntil && file.retentionUntil <= new Date())) throw new ApiError(410, 'EXPORT_EXPIRED', 'Export has expired.');
    const path = resolve(this.root, file.storageKey);
    if (!path.startsWith(`${this.root}\\`) && !path.startsWith(`${this.root}/`)) throw new ApiError(404, 'EXPORT_NOT_FOUND', 'Export was not found.');
    const bytes = await readFile(path);
    if (createHash('sha256').update(bytes).digest('hex') !== file.checksum) throw new ApiError(503, 'EXPORT_CHECKSUM_MISMATCH', 'Export is unavailable.', undefined, true);
    return { bytes, filename: file.filename, mimeType: file.mimeType };
  }
}

function sanitizeName(value: string) { return String(value || 'export').normalize('NFKC').replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 180) || 'export'; }
function csvCell(value: unknown) { let text = value == null ? '' : String(value); if (/^[=+\-@]/.test(text)) text = `'${text}`; return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
function bigintJsonReplacer(_key: string, value: unknown) { return typeof value === 'bigint' ? value.toString() : value; }
