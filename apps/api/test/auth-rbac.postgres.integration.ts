import { randomBytes, randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApplication } from '../src/app/bootstrap/create-application.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';
import { hashOpaqueToken, hashPassword } from '../src/modules/auth/domain/auth-security.js';

const origin = 'http://localhost:8080';
const organizationId = `org-integration-${randomUUID()}`;
const adminUserId = `user-integration-admin-${randomUUID()}`;
const adminEmail = `integration-admin-${randomUUID()}@example.test`;
const adminPassword = 'correct horse integration battery';

describe('PostgreSQL authentication and RBAC boundaries', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    app = await createApplication({
      NODE_ENV: 'development',
      AUTH_PROVIDER: 'database',
      DATABASE_URL: process.env.DATABASE_URL,
      CORS_ORIGINS: origin,
      COOKIE_SECURE: 'false',
      SESSION_SIGNING_KEY: randomBytes(32).toString('base64'),
      SECRET_MASTER_KEY: randomBytes(32).toString('base64'),
      FILE_STORAGE_PATH: '/tmp',
    });
    prisma = app.get(PrismaService);
    const now = new Date();
    await prisma.organization.create({ data: { id: organizationId, code: organizationId, name: 'Integration organization', createdAt: now, updatedAt: now } });
    await prisma.userProfile.create({
      data: {
        id: adminUserId,
        organizationId,
        externalUserId: adminUserId,
        externalAuthProvider: 'password',
        email: adminEmail,
        normalizedEmail: adminEmail,
        displayName: 'Integration Admin',
        status: 'active',
        emailVerifiedAt: now,
        createdAt: now,
        updatedAt: now,
      },
    });
    await prisma.userCredential.create({
      data: { id: `credential-${randomUUID()}`, userId: adminUserId, passwordHash: await hashPassword(adminPassword), passwordChangedAt: now, createdAt: now, updatedAt: now },
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
      await prisma.$transaction([
        prisma.authSession.deleteMany({ where: { userId: { in: userIds } } }),
        prisma.passwordResetToken.deleteMany({ where: { userId: { in: userIds } } }),
        prisma.authenticationAuditLog.deleteMany({ where: { organizationId } }),
        prisma.auditLog.deleteMany({ where: { organizationId } }),
        prisma.invitation.deleteMany({ where: { organizationId } }),
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

  it('keeps the explicit public allowlist open and rejects anonymous protected routes', async () => {
    expect((await app.inject({ method: 'GET', url: '/api/v1/health' })).statusCode).toBe(200);
    for (const request of [
      { method: 'GET' as const, url: '/api/v1/auth/me' },
      { method: 'GET' as const, url: '/api/v1/projects' },
      { method: 'GET' as const, url: `/api/v1/organizations/${organizationId}/members` },
      { method: 'GET' as const, url: '/api/v1/projects/unknown/members' },
      { method: 'GET' as const, url: '/api/projects' },
      { method: 'GET' as const, url: '/api/chart-types' },
      { method: 'GET' as const, url: '/api/charts' },
      { method: 'GET' as const, url: '/api/dashboards/unknown' },
      { method: 'GET' as const, url: '/api/dataset' },
      { method: 'POST' as const, url: '/api/dataset/query' },
      { method: 'GET' as const, url: '/api/v1/datasets' },
      { method: 'POST' as const, url: '/api/v1/datasets/unknown/query' },
      { method: 'GET' as const, url: '/api/v1/dashboards' },
      { method: 'POST' as const, url: '/api/v1/workspace/import' },
      { method: 'GET' as const, url: '/api/v1/settings/preferences' },
      { method: 'GET' as const, url: '/api/v1/connections' },
      { method: 'GET' as const, url: '/api/connections' },
      { method: 'POST' as const, url: '/api/v1/shares' },
      { method: 'POST' as const, url: '/api/shares' },
      { method: 'POST' as const, url: '/api/v1/exports' },
      { method: 'POST' as const, url: '/api/exports' },
    ]) {
      const response = await app.inject(request);
      expect(response.statusCode, `${request.method} ${request.url}`).toBe(401);
      expect(response.json()).toMatchObject({ code: 'AUTHENTICATION_REQUIRED' });
      expect(response.json().requestId).toBeTruthy();
    }
  });

  it('stores only a session hash, enforces CSRF, and revokes the session on logout', async () => {
    const login = await loginAs(adminEmail, adminPassword);
    expect(login.response.statusCode).toBe(200);
    expect(login.response.body).not.toContain(adminPassword);
    const rawSession = cookieValue(login.cookies, 'mini_bi_session');
    const stored = await prisma.authSession.findUnique({ where: { tokenHash: hashOpaqueToken(rawSession) } });
    expect(stored?.tokenHash).toBe(hashOpaqueToken(rawSession));
    expect(stored?.tokenHash).not.toBe(rawSession);

    const csrfDenied = await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: { cookie: login.cookie } });
    expect(csrfDenied.statusCode).toBe(403);
    expect(csrfDenied.json().code).toBe('CSRF_REJECTED');

    const logout = await app.inject({ method: 'POST', url: '/api/v1/auth/logout', headers: login.mutationHeaders });
    expect(logout.statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: '/api/v1/auth/me', headers: { cookie: login.cookie } })).statusCode).toBe(401);
  });

  it('uses revision control under concurrent project updates without silent last-write-wins', async () => {
    const login = await loginAs(adminEmail, adminPassword);
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
    const login = await loginAs(adminEmail, adminPassword);
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
    const login = await loginAs(adminEmail, adminPassword);
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

  it('consumes an invitation once under concurrency and protects the last organization admin', async () => {
    const login = await loginAs(adminEmail, adminPassword);
    const invitedEmail = `invited-${randomUUID()}@example.test`;
    const invitation = await app.inject({
      method: 'POST',
      url: `/api/v1/organizations/${organizationId}/invitations`,
      headers: login.mutationHeaders,
      payload: { email: invitedEmail, role: 'member' },
    });
    expect(invitation.statusCode).toBe(201);
    const token = invitation.json().data.token;
    const acceptance = () => app.inject({
      method: 'POST',
      url: '/api/v1/auth/accept-invitation',
      payload: { token, displayName: 'Invited User', password: 'correct horse invitation battery' },
    });
    const accepted = await Promise.all([acceptance(), acceptance()]);
    expect(accepted.map(item => item.statusCode).sort()).toEqual([200, 400]);
    const invitedUser = await prisma.userProfile.findUnique({ where: { normalizedEmail: invitedEmail } });
    expect(invitedUser).toBeTruthy();
    expect(await prisma.organizationMember.count({ where: { organizationId, userId: invitedUser!.id } })).toBe(1);

    const downgrade = await app.inject({
      method: 'PATCH',
      url: `/api/v1/organizations/${organizationId}/members/${adminUserId}`,
      headers: login.mutationHeaders,
      payload: { role: 'member' },
    });
    expect(downgrade.statusCode).toBe(409);
    expect(downgrade.json().code).toBe('LAST_ORGANIZATION_ADMIN');
  });

  async function loginAs(email: string, password: string) {
    const response = await app.inject({ method: 'POST', url: '/api/v1/auth/login', payload: { email, password } });
    const cookies = Array.isArray(response.headers['set-cookie']) ? response.headers['set-cookie'] : [String(response.headers['set-cookie'] || '')];
    const cookie = cookies.map(value => value.split(';')[0]).join('; ');
    return {
      response,
      cookies,
      cookie,
      mutationHeaders: { cookie, origin, 'x-csrf-token': cookieValue(cookies, 'mini_bi_csrf') },
    };
  }
});

function cookieValue(cookies: string[], name: string) {
  const cookie = cookies.find(value => value.startsWith(`${name}=`));
  return decodeURIComponent(cookie?.split(';')[0]?.slice(name.length + 1) || '');
}

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
