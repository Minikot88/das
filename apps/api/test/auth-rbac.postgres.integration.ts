import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApplication } from '../src/app/bootstrap/create-application.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';

const origin = 'http://localhost:8080';
const organizationId = `org-integration-${randomUUID()}`;
const adminUserId = `user-integration-admin-${randomUUID()}`;
const adminEmail = `integration-admin-${randomUUID()}@example.test`;

describe('PostgreSQL authentication and RBAC boundaries', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createApplication({
      NODE_ENV: 'development',
      AUTH_MODE: 'disabled',
      INTERNAL_SINGLE_USER_ID: adminUserId,
      DATABASE_URL: process.env.DATABASE_URL,
      CORS_ORIGINS: origin,
      SECRET_MASTER_KEY: randomBytes(32).toString('base64'),
      FILE_STORAGE_PATH: '/tmp/uploads',
    });
    prisma = app.get(PrismaService);
    const now = new Date();
    await prisma.organization.create({ data: { id: organizationId, code: organizationId, name: 'Integration organization', createdAt: now, updatedAt: now } });
    await prisma.userProfile.create({
      data: {
        id: adminUserId,
        organizationId,
        externalUserId: adminUserId,
        externalAuthProvider: 'technical-test',
        email: adminEmail,
        normalizedEmail: adminEmail,
        displayName: 'Integration Admin',
        status: 'active',
        emailVerifiedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    });
    await prisma.organizationMember.create({
      data: { id: `org-member-${randomUUID()}`, organizationId, userId: adminUserId, role: 'organization_admin', createdAt: now, updatedAt: now },
    });
  });

  afterAll(async () => {
    if (prisma) {
      const users = await prisma.userProfile.findMany({ where: { organizationId }, select: { id: true } });
      const userIds = users.map(item => item.id);
      const projects = await prisma.biProject.findMany({ where: { organizationId }, select: { id: true } });
      const projectIds = projects.map(item => item.id);
      const datasets = await prisma.dataset.findMany({ where: { organizationId }, select: { id: true } });
      const datasetIds = datasets.map(item => item.id);
      const imports = await prisma.importJob.findMany({ where: { organizationId }, select: { id: true } });
      const importIds = imports.map(item => item.id);
      const shares = await prisma.dashboardShareLink.findMany({ where: { organizationId }, select: { id: true } });
      const shareIds = shares.map(item => item.id);
      const exports = await prisma.exportJob.findMany({ where: { organizationId }, select: { id: true } });
      const exportIds = exports.map(item => item.id);
      const files = await prisma.fileRecord.findMany({ where: { organizationId }, select: { id: true } });
      const fileIds = files.map(item => item.id);
      await prisma.$transaction([
        prisma.authSession.deleteMany({ where: { userId: { in: userIds } } }),
        prisma.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } }),
        prisma.authenticationAuditLog.deleteMany({ where: { organizationId } }),
        prisma.auditLog.deleteMany({ where: { organizationId } }),
        prisma.invitation.deleteMany({ where: { organizationId } }),
        prisma.dashboardShareAccessLog.deleteMany({ where: { shareId: { in: shareIds } } }),
        prisma.dashboardShareSnapshot.deleteMany({ where: { shareId: { in: shareIds } } }),
        prisma.dashboardShareLink.deleteMany({ where: { organizationId } }),
        prisma.exportFile.deleteMany({ where: { OR: [{ exportId: { in: exportIds } }, { fileId: { in: fileIds } }] } }),
        prisma.exportJob.deleteMany({ where: { organizationId } }),
        prisma.fileRecord.deleteMany({ where: { organizationId } }),
        prisma.dashboardWidget.deleteMany({ where: { organizationId } }),
        prisma.biDashboard.deleteMany({ where: { organizationId } }),
        prisma.chart.deleteMany({ where: { organizationId } }),
        prisma.importError.deleteMany({ where: { importId: { in: importIds } } }),
        prisma.importJobRow.deleteMany({ where: { importId: { in: importIds } } }),
        prisma.importJob.deleteMany({ where: { organizationId } }),
        prisma.datasetValidationResult.deleteMany({ where: { datasetId: { in: datasetIds } } }),
        prisma.datasetStatistic.deleteMany({ where: { datasetId: { in: datasetIds } } }),
        prisma.datasetVersion.deleteMany({ where: { datasetId: { in: datasetIds } } }),
        prisma.datasetRow.deleteMany({ where: { datasetId: { in: datasetIds } } }),
        prisma.datasetField.deleteMany({ where: { datasetId: { in: datasetIds } } }),
        prisma.dataset.deleteMany({ where: { organizationId } }),
        prisma.biProjectMember.deleteMany({ where: { organizationId } }),
        prisma.organizationMember.deleteMany({ where: { organizationId } }),
        prisma.userCredential.deleteMany({ where: { userId: { in: userIds } } }),
        prisma.biProject.deleteMany({ where: { id: { in: projectIds } } }),
        prisma.userProfile.deleteMany({ where: { organizationId } }),
        prisma.organization.deleteMany({ where: { id: organizationId } }),
      ]);
    }
    await app?.close();
  });

  it('opens health and uses only the configured technical principal in disabled integration mode', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/v1/health' })).statusCode).toBe(200);
    const session = await app.inject({ method: 'GET', url: '/api/session/me' });
    expect(session.statusCode).toBe(200);
    expect(session.json().data).toMatchObject({
      authenticated: true,
      authMode: 'disabled',
      actorId: adminUserId,
      organizationId,
      roles: ['organization_admin'],
    });
  });

  it('does not create cookie sessions and closes the built-in logout endpoint', async () => {
    expect(await prisma.authSession.count({ where: { userId: adminUserId } })).toBe(0);
    const logout = await app.inject({ method: 'POST', url: '/api/v1/auth/logout' });
    expect(logout.statusCode).toBe(410);
    expect(logout.headers['set-cookie']).toBeUndefined();
    expect(logout.json()).toMatchObject({ code: 'BUILT_IN_AUTH_REMOVED' });
  });

  it('does not create password-reset tokens from the removed endpoint', async () => {
    await prisma.passwordResetToken.deleteMany({ where: { userId: adminUserId } });
    const requests = await Promise.all(Array.from({ length: 8 }, (_, index) => app.inject({
      method: 'POST',
      url: '/api/v1/auth/forgot-password',
      payload: { email: adminEmail },
      remoteAddress: `192.0.2.${index + 1}`,
    })));
    expect(requests.every(response => response.statusCode === 410)).toBe(true);
    expect(await prisma.passwordResetToken.count({
      where: { userId: adminUserId, usedAt: null, revokedAt: null, expiresAt: { gt: new Date() } },
    })).toBe(0);
  });

  it('uses revision control under concurrent project updates without silent last-write-wins', async () => {
    const login = await technicalSession();
    const created = await app.inject({ method: 'POST', url: '/api/v1/projects', headers: login.mutationHeaders, payload: { name: 'Concurrent project' } });
    expect(created.statusCode).toBe(201);
    const project = created.json().data;
    const responses = await Promise.all([
      app.inject({ method: 'PATCH', url: `/api/v1/projects/${project.id}`, headers: login.mutationHeaders, payload: { name: 'First writer', revision: 0 } }),
      app.inject({ method: 'PATCH', url: `/api/v1/projects/${project.id}`, headers: login.mutationHeaders, payload: { name: 'Second writer', revision: 0 } }),
    ]);
    expect(responses.map(item => item.statusCode).sort()).toEqual([200, 409]);
    const loaded = await app.inject({ method: 'GET', url: `/api/v1/projects/${project.id}`, headers: { cookie: login.cookie } });
    expect(loaded.json().data.revision).toBe(1);
  });

  it('uses revision control under concurrent dashboard updates without silent last-write-wins', async () => {
    const login = await technicalSession();
    const project = await app.inject({ method: 'POST', url: '/api/v1/projects', headers: login.mutationHeaders, payload: { name: `Dashboard race ${randomUUID()}` } });
    const dashboard = await app.inject({ method: 'POST', url: '/api/v1/dashboards', headers: login.mutationHeaders, payload: { projectId: project.json().data.id, name: 'Concurrent dashboard' } });
    expect(dashboard.statusCode).toBe(201);
    const dashboardId = dashboard.json().data.id;
    const responses = await Promise.all([
      app.inject({ method: 'PATCH', url: `/api/v1/dashboards/${dashboardId}`, headers: login.mutationHeaders, payload: { name: 'Dashboard writer one', revision: 0 } }),
      app.inject({ method: 'PATCH', url: `/api/v1/dashboards/${dashboardId}`, headers: login.mutationHeaders, payload: { name: 'Dashboard writer two', revision: 0 } }),
    ]);
    expect(responses.map(response => response.statusCode).sort()).toEqual([200, 409]);
    expect((await prisma.biDashboard.findUnique({ where: { id: dashboardId } }))?.revision).toBe(1);
  });

  it('uses revision control under concurrent widget-layout saves without mixing writers', async () => {
    const login = await technicalSession();
    const project = await app.inject({ method: 'POST', url: '/api/v1/projects', headers: login.mutationHeaders, payload: { name: `Widget race ${randomUUID()}` } });
    const dashboard = await app.inject({ method: 'POST', url: '/api/v1/dashboards', headers: login.mutationHeaders, payload: { projectId: project.json().data.id, name: 'Concurrent layout' } });
    const dashboardId = dashboard.json().data.id;
    const save = (id: string, x: number) => app.inject({
      method: 'PATCH', url: `/api/v1/dashboards/${dashboardId}/widgets`, headers: login.mutationHeaders,
      payload: { revision: 0, widgets: [{ id, type: 'text', x, y: 0, w: 4, h: 2 }] },
    });
    const responses = await Promise.all([save(`widget-a-${randomUUID()}`, 0), save(`widget-b-${randomUUID()}`, 6)]);
    expect(responses.map(response => response.statusCode).sort()).toEqual([200, 409]);
    expect(await prisma.dashboardWidget.count({ where: { dashboardId } })).toBe(1);
    expect((await prisma.biDashboard.findUnique({ where: { id: dashboardId } }))?.revision).toBe(1);
  });

  it('rolls back all writes when a transaction fails halfway', async () => {
    const normalizedEmail = `rollback-${randomUUID()}@example.test`;
    const firstId = `user-rollback-a-${randomUUID()}`;
    const secondId = `user-rollback-b-${randomUUID()}`;
    const profile = (id: string) => ({
      id,
      organizationId,
      externalUserId: id,
      externalAuthProvider: 'password',
      email: normalizedEmail,
      normalizedEmail,
      displayName: 'Rollback user',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await expect(prisma.$transaction(async tx => {
      await tx.userProfile.create({ data: profile(firstId) });
      await tx.userProfile.create({ data: profile(secondId) });
    })).rejects.toBeTruthy();
    expect(await prisma.userProfile.count({ where: { normalizedEmail } })).toBe(0);
  });

  it('imports and queries CSV through PostgreSQL, is idempotent, and leaves no partial rows on parser failure', async () => {
    const login = await technicalSession();
    const created = await app.inject({ method: 'POST', url: '/api/v1/projects', headers: login.mutationHeaders, payload: { name: `Dataset project ${randomUUID()}` } });
    const projectId = created.json().data.id;
    const idempotencyKey = `csv-${randomUUID()}`;
    const upload = multipartCsv(projectId, 'Revenue.csv', 'region,amount,note\nNorth,10,=SUM(A1:A2)\nSouth,20,ok\n', idempotencyKey);
    const imported = await app.inject({ method: 'POST', url: '/api/v1/datasets/import', headers: { ...login.mutationHeaders, ...upload.headers }, payload: upload.body });
    expect(imported.statusCode).toBe(201);
    expect(imported.json().data).toMatchObject({ duplicate: false, dataset: { status: 'ready', rowCount: 2, fieldCount: 3 } });
    const datasetId = imported.json().data.dataset.id;

    const query = await app.inject({
      method: 'POST',
      url: `/api/v1/datasets/${datasetId}/query`,
      headers: login.mutationHeaders,
      payload: { groupBy: ['region'], aggregates: [{ field: 'amount', operation: 'sum', alias: 'total' }], sort: { field: 'region', direction: 'asc' } },
    });
    expect(query.statusCode).toBe(200);
    expect(query.json().data).toMatchObject({ total: 2, rows: [{ region: 'North', total: 10 }, { region: 'South', total: 20 }] });
    const storedFormula = await prisma.datasetRow.findFirst({ where: { datasetId, rowNumber: 1 } });
    expect((storedFormula?.rowJson as Record<string, unknown>).note).toBe("'=SUM(A1:A2)");

    const duplicateUpload = multipartCsv(projectId, 'Revenue.csv', 'region,amount,note\nNorth,99,changed\n', idempotencyKey);
    const duplicate = await app.inject({ method: 'POST', url: '/api/v1/datasets/import', headers: { ...login.mutationHeaders, ...duplicateUpload.headers }, payload: duplicateUpload.body });
    expect(duplicate.statusCode).toBe(201);
    expect(duplicate.json().data).toMatchObject({ duplicate: true, importJob: { datasetId } });
    expect(await prisma.dataset.count({ where: { organizationId, projectId } })).toBe(1);

    const failedKey = `csv-failed-${randomUUID()}`;
    const invalidUpload = multipartCsv(projectId, 'Invalid.csv', 'duplicate,duplicate\n1,2\n', failedKey);
    const failed = await app.inject({ method: 'POST', url: '/api/v1/datasets/import', headers: { ...login.mutationHeaders, ...invalidUpload.headers }, payload: invalidUpload.body });
    expect(failed.statusCode).toBe(400);
    expect(failed.json().code).toBe('CSV_IMPORT_FAILED');
    const failedJob = await prisma.importJob.findUnique({ where: { organizationId_idempotencyKey: { organizationId, idempotencyKey: failedKey } } });
    const failedDataset = await prisma.dataset.findUnique({ where: { id: failedJob!.datasetId! } });
    expect(failedJob?.status).toBe('failed');
    expect(failedDataset?.status).toBe('failed');
    expect(await prisma.datasetRow.count({ where: { datasetId: failedDataset!.id } })).toBe(0);
  });

  it('imports a complete workspace atomically, deduplicates it, and rolls back broken references', async () => {
    const login = await technicalSession();
    const sourceProjectId = `workspace-project-${randomUUID()}`;
    const sourceDatasetId = `workspace-dataset-${randomUUID()}`;
    const sourceChartId = `workspace-chart-${randomUUID()}`;
    const sourceDashboardId = `workspace-dashboard-${randomUUID()}`;
    const sourceWidgetId = `workspace-widget-${randomUUID()}`;
    const workspace = {
      schemaVersion: 1,
      projects: [{
        id: sourceProjectId,
        name: `Imported workspace ${randomUUID()}`,
        datasets: [{ id: sourceDatasetId, name: 'Workspace rows', fields: [{ name: 'region', type: 'string' }, { name: 'amount', type: 'number' }], rows: [{ region: 'North', amount: 12.5 }] }],
        charts: [{ id: sourceChartId, datasetId: sourceDatasetId, name: 'Workspace chart', mapping: { x: 'region', y: 'amount' } }],
        dashboards: [{ id: sourceDashboardId, name: 'Workspace dashboard', widgets: [{ id: sourceWidgetId, chartId: sourceChartId, type: 'chart', x: 0, y: 0, w: 6, h: 4 }] }],
      }],
    };
    const imported = await app.inject({ method: 'POST', url: '/api/v1/workspace/import', headers: login.mutationHeaders, payload: workspace });
    expect(imported.statusCode).toBe(201);
    expect(imported.json().data).toMatchObject({
      duplicate: false,
      mapping: {
        projects: { [sourceProjectId]: sourceProjectId },
        datasets: { [sourceDatasetId]: sourceDatasetId },
        charts: { [sourceChartId]: sourceChartId },
        dashboards: { [sourceDashboardId]: sourceDashboardId },
        widgets: { [`${sourceDashboardId}:${sourceWidgetId}`]: sourceWidgetId },
      },
    });
    expect(await prisma.datasetRow.count({ where: { datasetId: sourceDatasetId } })).toBe(1);
    expect(await prisma.chart.count({ where: { id: sourceChartId, projectId: sourceProjectId, datasetId: sourceDatasetId } })).toBe(1);
    expect(await prisma.dashboardWidget.count({ where: { id: sourceWidgetId, dashboardId: sourceDashboardId, chartId: sourceChartId } })).toBe(1);

    const duplicate = await app.inject({ method: 'POST', url: '/api/v1/workspace/import', headers: login.mutationHeaders, payload: workspace });
    expect(duplicate.statusCode).toBe(201);
    expect(duplicate.json().data.duplicate).toBe(true);
    expect(await prisma.biProject.count({ where: { id: sourceProjectId } })).toBe(1);

    const brokenProjectId = `workspace-broken-${randomUUID()}`;
    const broken = await app.inject({
      method: 'POST',
      url: '/api/v1/workspace/import',
      headers: login.mutationHeaders,
      payload: { schemaVersion: 1, projects: [{ id: brokenProjectId, name: 'Broken workspace', charts: [{ id: `chart-${randomUUID()}`, datasetId: 'missing-dataset' }] }] },
    });
    expect(broken.statusCode).toBe(400);
    expect(broken.json().code).toBe('CROSS_PROJECT_REFERENCE');
    expect(await prisma.biProject.count({ where: { id: brokenProjectId } })).toBe(0);
  });

  it('persists immutable shares and safe exports, and rolls back a failed share snapshot', async () => {
    const login = await technicalSession();
    const projectId = `share-project-${randomUUID()}`;
    const datasetId = `share-dataset-${randomUUID()}`;
    const dashboardId = `share-dashboard-${randomUUID()}`;
    const workspace = {
      schemaVersion: 1,
      projects: [{
        id: projectId,
        name: 'Share and export project',
        datasets: [{ id: datasetId, name: 'Formula dataset', fields: [{ name: 'name', type: 'string' }, { name: 'value', type: 'string' }], rows: [{ name: 'row', value: '=SUM(A1:A2)' }] }],
        charts: [],
        dashboards: [{ id: dashboardId, name: 'Immutable dashboard', widgets: [] }],
      }],
    };
    expect((await app.inject({ method: 'POST', url: '/api/v1/workspace/import', headers: login.mutationHeaders, payload: workspace })).statusCode).toBe(201);

    const created = await app.inject({
      method: 'POST', url: '/api/v1/shares', headers: login.mutationHeaders,
      payload: { dashboardId, allowedOrigins: ['https://embed.example.test'], expiresAt: new Date(Date.now() + 60_000).toISOString() },
    });
    expect(created.statusCode).toBe(201);
    const share = created.json().data;
    const resolved = await app.inject({ method: 'GET', url: `/api/v1/shares/${share.token}`, headers: { origin: 'https://embed.example.test' } });
    expect(resolved.statusCode).toBe(200);
    expect(resolved.json().data.snapshot).toMatchObject({ dashboardId, dashboardName: 'Immutable dashboard' });
    expect((await app.inject({ method: 'GET', url: `/api/v1/shares/${share.token}`, headers: { origin: 'https://blocked.example.test' } })).statusCode).toBe(403);

    const exported = await app.inject({
      method: 'POST', url: '/api/v1/exports', headers: login.mutationHeaders,
      payload: { projectId, entityType: 'dataset', entityId: datasetId, format: 'csv' },
    });
    expect(exported.statusCode).toBe(201);
    const downloaded = await app.inject({ method: 'GET', url: `/api/v1/exports/${exported.json().data.id}/file`, headers: { cookie: login.cookie } });
    expect(downloaded.statusCode).toBe(200);
    expect(downloaded.headers['content-type']).toContain('text/csv');
    expect(downloaded.body).toContain("'=SUM(A1:A2)");

    const revoked = await app.inject({ method: 'PATCH', url: `/api/v1/shares/${share.id}/revoke`, headers: login.mutationHeaders, payload: { revision: 0 } });
    expect(revoked.statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: `/api/v1/shares/${share.token}` })).statusCode).toBe(404);

    const existingSnapshot = await prisma.dashboardShareSnapshot.findUniqueOrThrow({ where: { shareId: share.id } });
    const createSnapshot = prisma.dashboardShareSnapshot.create.bind(prisma.dashboardShareSnapshot);
    const createSnapshotSpy = vi.spyOn(prisma.dashboardShareSnapshot, 'create').mockImplementationOnce((args) =>
      createSnapshot({ ...args, data: { ...args.data, id: existingSnapshot.id } }),
    );
    const before = await prisma.dashboardShareLink.count({ where: { organizationId, dashboardId } });
    try {
      const failed = await app.inject({ method: 'POST', url: '/api/v1/shares', headers: login.mutationHeaders, payload: { dashboardId } });
      expect(failed.statusCode).toBe(500);
      expect(failed.json()).toMatchObject({ code: 'INTERNAL_ERROR', message: 'An unexpected error occurred.' });
      expect(failed.body).not.toMatch(/unique constraint|dashboard_share_snapshots|prisma/i);
      expect(await prisma.dashboardShareLink.count({ where: { organizationId, dashboardId } })).toBe(before);
    } finally {
      createSnapshotSpy.mockRestore();
    }
  });

  it('keeps invitation acceptance closed and protects the last organization admin', async () => {
    const login = await technicalSession();
    const invitedEmail = `invited-${randomUUID()}@example.test`;
    const invitation = await app.inject({
      method: 'POST',
      url: `/api/v1/organizations/${organizationId}/invitations`,
      headers: login.mutationHeaders,
      payload: { email: invitedEmail, role: 'member' },
    });
    expect(invitation.statusCode).toBe(410);
    expect(invitation.json()).toMatchObject({ code: 'BUILT_IN_AUTH_REMOVED' });
    const acceptance = await app.inject({
      method: 'POST',
      url: '/api/v1/auth/accept-invitation',
      payload: { token: 'removed', displayName: 'Invited User', password: 'not-used' },
    });
    expect(acceptance.statusCode).toBe(410);
    const invitedUser = await prisma.userProfile.findUnique({ where: { normalizedEmail: invitedEmail } });
    expect(invitedUser).toBeNull();

    const downgrade = await app.inject({
      method: 'PATCH',
      url: `/api/v1/organizations/${organizationId}/members/${adminUserId}`,
      headers: login.mutationHeaders,
      payload: { role: 'member' },
    });
    expect(downgrade.statusCode).toBe(409);
    expect(downgrade.json().code).toBe('LAST_ORGANIZATION_ADMIN');
  });

  async function technicalSession() {
    return { cookie: '', mutationHeaders: {} };
  }
});

function multipartCsv(projectId: string, filename: string, csv: string, idempotencyKey: string) {
  const boundary = `----dashboard-mini-bi-${randomUUID()}`;
  const parts = [
    `--${boundary}\r\nContent-Disposition: form-data; name="projectId"\r\n\r\n${projectId}\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="name"\r\n\r\n${filename.replace(/\.csv$/i, '')}\r\n`,
    `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: text/csv\r\n\r\n${csv}\r\n`,
    `--${boundary}--\r\n`,
  ];
  return {
    body: Buffer.from(parts.join('')),
    headers: { 'content-type': `multipart/form-data; boundary=${boundary}`, 'idempotency-key': idempotencyKey },
  };
}
