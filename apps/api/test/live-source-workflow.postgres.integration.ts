import { randomBytes, randomUUID } from 'node:crypto';
import { rm } from 'node:fs/promises';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { createApplication } from '../src/app/bootstrap/create-application.js';
import { PrismaService } from '../src/infrastructure/database/prisma.service.js';

const origin = 'http://localhost:8080';
const runId = randomUUID();
const organizationId = `org-live-source-${runId}`;
const userId = `user-live-source-${runId}`;
const sourceId = `source-live-${runId}`;
const email = `live-source-${runId}@example.test`;
const storagePath = `/tmp/dashboardmini-live-source-${runId}/uploads`;

describe('live PostgreSQL source workflow', () => {
  let app: NestFastifyApplication;
  let prisma: PrismaService;

  beforeAll(async () => {
    assertTemporaryDatabase(process.env.DATABASE_URL);
    app = await createApplication({
      NODE_ENV: 'development',
      AUTH_MODE: 'disabled',
      INTERNAL_SINGLE_USER_ID: userId,
      DATABASE_URL: process.env.DATABASE_URL,
      EXTERNAL_SOURCE_SCHEMAS: 'scopus',
      CORS_ORIGINS: origin,
      SECRET_MASTER_KEY: randomBytes(32).toString('base64'),
      FILE_STORAGE_PATH: storagePath,
    });
    prisma = app.get(PrismaService);
    const now = new Date();
    const type = await prisma.dataSourceType.findUniqueOrThrow({ where: { code: 'postgresql' } });
    const databaseName = new URL(process.env.DATABASE_URL!).pathname.slice(1);
    await prisma.organization.create({ data: { id: organizationId, code: organizationId, name: 'Live source integration', createdAt: now, updatedAt: now } });
    await prisma.userProfile.create({ data: {
      id: userId,
      organizationId,
      externalUserId: userId,
        externalAuthProvider: 'technical-test',
      email,
      normalizedEmail: email,
      displayName: 'Live Source Admin',
      status: 'active',
      emailVerifiedAt: now,
      createdAt: now,
      updatedAt: now,
    } });
    await prisma.organizationMember.create({ data: { id: `member-${runId}`, organizationId, userId, role: 'organization_admin', createdAt: now, updatedAt: now } });
    await prisma.dataSourceConnection.create({ data: {
      id: sourceId,
      organizationId,
      typeId: type.id,
      name: 'Scopus PostgreSQL',
      host: '127.0.0.1',
      port: 5432,
      databaseName,
      mode: 'live',
      readOnly: true,
      status: 'ready',
    } });
    await prisma.dataSourceSecretReference.create({ data: {
      id: `secret-${runId}`,
      organizationId,
      connectionId: sourceId,
      provider: 'runtime_environment',
      secretRef: 'DATABASE_URL',
    } });
    await prisma.dataSourceSchema.create({ data: {
      id: `schema-${runId}`,
      connectionId: sourceId,
      name: 'scopus',
      readOnly: true,
      tablePolicyJson: { mode: 'allow_all_discovered' },
    } });
  });

  afterAll(async () => {
    if (prisma) {
      const projects = await prisma.biProject.findMany({ where: { organizationId }, select: { id: true } });
      const projectIds = projects.map(item => item.id);
      const datasets = await prisma.dataset.findMany({ where: { organizationId }, select: { id: true } });
      const datasetIds = datasets.map(item => item.id);
      const shares = await prisma.dashboardShareLink.findMany({ where: { organizationId }, select: { id: true } });
      const shareIds = shares.map(item => item.id);
      const exports = await prisma.exportJob.findMany({ where: { organizationId }, select: { id: true } });
      const exportIds = exports.map(item => item.id);
      const files = await prisma.fileRecord.findMany({ where: { organizationId }, select: { id: true } });
      const fileIds = files.map(item => item.id);
      const tables = await prisma.dataSourceTable.findMany({ where: { connectionId: sourceId }, select: { id: true } });
      await prisma.$transaction([
        prisma.authSession.deleteMany({ where: { userId } }),
        prisma.authenticationAuditLog.deleteMany({ where: { organizationId } }),
        prisma.auditLog.deleteMany({ where: { organizationId } }),
        prisma.dashboardShareAccessLog.deleteMany({ where: { shareId: { in: shareIds } } }),
        prisma.dashboardShareSnapshot.deleteMany({ where: { shareId: { in: shareIds } } }),
        prisma.dashboardShareLink.deleteMany({ where: { organizationId } }),
        prisma.exportFile.deleteMany({ where: { OR: [{ exportId: { in: exportIds } }, { fileId: { in: fileIds } }] } }),
        prisma.exportJob.deleteMany({ where: { organizationId } }),
        prisma.fileRecord.deleteMany({ where: { organizationId } }),
        prisma.dashboardWidget.deleteMany({ where: { organizationId } }),
        prisma.biDashboard.deleteMany({ where: { organizationId } }),
        prisma.chart.deleteMany({ where: { organizationId } }),
        prisma.datasetVersion.deleteMany({ where: { datasetId: { in: datasetIds } } }),
        prisma.datasetField.deleteMany({ where: { datasetId: { in: datasetIds } } }),
        prisma.dataset.deleteMany({ where: { organizationId } }),
        prisma.dataSourceRelationship.deleteMany({ where: { connectionId: sourceId } }),
        prisma.dataSourceColumn.deleteMany({ where: { tableId: { in: tables.map(item => item.id) } } }),
        prisma.dataSourceTable.deleteMany({ where: { connectionId: sourceId } }),
        prisma.dataSourceSchema.deleteMany({ where: { connectionId: sourceId } }),
        prisma.dataSourceSecretReference.deleteMany({ where: { connectionId: sourceId } }),
        prisma.dataSourceConnection.deleteMany({ where: { id: sourceId } }),
        prisma.biProjectMember.deleteMany({ where: { organizationId } }),
        prisma.organizationMember.deleteMany({ where: { organizationId } }),
        prisma.userCredential.deleteMany({ where: { userId } }),
        prisma.biProject.deleteMany({ where: { id: { in: projectIds } } }),
        prisma.userProfile.deleteMany({ where: { organizationId } }),
        prisma.organization.deleteMany({ where: { id: organizationId } }),
      ]);
    }
    await app?.close();
    await rm(`/tmp/dashboardmini-live-source-${runId}`, { recursive: true, force: true });
  });

  it('creates a live joined dataset, chart, dashboard, share, and export through the API', async () => {
    const headers = {};

    const projectResponse = await app.inject({ method: 'POST', url: '/api/v1/projects', headers, payload: { name: 'Live source workflow' } });
    expect(projectResponse.statusCode).toBe(201);
    const projectId = projectResponse.json().data.id as string;

    const sourceList = await app.inject({ method: 'GET', url: `/api/v1/external-sources?projectId=${projectId}`, headers });
    expect(sourceList.statusCode).toBe(200);
    expect(sourceList.json().data.items).toEqual([expect.objectContaining({ id: sourceId, schemaName: 'scopus', readOnly: true })]);

    const refresh = await app.inject({ method: 'POST', url: `/api/v1/external-sources/${sourceId}/refresh?projectId=${projectId}`, headers });
    expect(refresh.statusCode).toBe(200);
    expect(refresh.json().data).toMatchObject({ sourceId, schemas: 1, objects: 2, fields: 6, relationships: 1 });

    const definition = {
      projectId,
      name: 'Articles by journal and year',
      sourceSchema: 'scopus',
      baseTable: 'sc_articles',
      selectedTables: [
        { schema: 'scopus', table: 'sc_articles', alias: 'articles' },
        { schema: 'scopus', table: 'sc_journals', alias: 'journals' },
      ],
      selectedFields: [
        { tableAlias: 'articles', column: 'publication_year', alias: 'publication_year' },
        { tableAlias: 'journals', column: 'title', alias: 'journal_title' },
      ],
      joins: [{
        left: { schema: 'scopus', table: 'sc_articles', alias: 'articles', column: 'journal_id' },
        right: { schema: 'scopus', table: 'sc_journals', alias: 'journals', column: 'id' },
        joinType: 'left',
        operator: 'eq',
      }],
      groupBy: [
        { tableAlias: 'articles', column: 'publication_year' },
        { tableAlias: 'journals', column: 'title' },
      ],
      aggregations: [{ field: { tableAlias: 'articles', column: 'id' }, operation: 'count', alias: 'article_count' }],
      semanticTypeOverrides: { 'articles.publication_year': 'Year', 'journals.title': 'Category' },
      rowLimit: 100,
    };
    const datasetResponse = await app.inject({ method: 'POST', url: '/api/v1/datasets/external', headers, payload: definition });
    expect(datasetResponse.statusCode).toBe(201);
    const dataset = datasetResponse.json().data;
    expect(dataset).toMatchObject({ dataSourceId: sourceId, sourceMode: 'live', sourceType: 'postgres_schema' });

    const query = await app.inject({ method: 'POST', url: `/api/v1/datasets/${dataset.id}/query`, headers, payload: { page: 1, pageSize: 100 } });
    expect(query.statusCode).toBe(200);
    expect(query.json().data.rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ publication_year: 2025, journal_title: 'Journal A', article_count: '1' }),
      expect.objectContaining({ publication_year: 2025, journal_title: 'Journal B', article_count: '1' }),
    ]));

    const chartResponse = await app.inject({ method: 'POST', url: '/api/v1/charts', headers, payload: {
      projectId,
      datasetId: dataset.id,
      name: 'Articles by journal',
      templateId: 'bar',
      mapping: { category: 'publication_year', value: 'article_count', series: 'journal_title' },
    } });
    expect(chartResponse.statusCode).toBe(201);
    const chartId = chartResponse.json().data.id as string;

    const dashboardResponse = await app.inject({ method: 'POST', url: '/api/v1/dashboards', headers, payload: { projectId, name: 'Scopus overview' } });
    expect(dashboardResponse.statusCode).toBe(201);
    const dashboardId = dashboardResponse.json().data.id as string;
    expect((await app.inject({ method: 'POST', url: `/api/v1/dashboards/${dashboardId}/charts`, headers, payload: { chartId } })).statusCode).toBe(201);

    const shareResponse = await app.inject({ method: 'POST', url: '/api/v1/shares', headers, payload: { dashboardId } });
    expect(shareResponse.statusCode).toBe(201);
    const share = shareResponse.json().data;
    const resolvedShare = await app.inject({ method: 'GET', url: `/api/v1/shares/${share.token}` });
    expect(resolvedShare.statusCode).toBe(200);
    expect(resolvedShare.json().data.snapshot.widgets[0].chart.dataContractJson.rows).toHaveLength(3);

    const exportResponse = await app.inject({ method: 'POST', url: '/api/v1/exports', headers, payload: { projectId, entityType: 'dataset', entityId: dataset.id, format: 'csv' } });
    expect(exportResponse.statusCode).toBe(201);
    const download = await app.inject({ method: 'GET', url: `/api/v1/exports/${exportResponse.json().data.id}/file`, headers });
    expect(download.statusCode).toBe(200);
    expect(download.body).toContain('publication_year,journal_title,article_count');

    expect((await app.inject({ method: 'GET', url: `/api/v1/datasets/${dataset.id}`, headers })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: `/api/v1/charts/${chartId}`, headers })).statusCode).toBe(200);
    expect((await app.inject({ method: 'GET', url: `/api/v1/dashboards/${dashboardId}`, headers })).statusCode).toBe(200);
  });
});

function assertTemporaryDatabase(databaseUrl: string | undefined) {
  if (!databaseUrl) throw new Error('DATABASE_URL is required for integration tests.');
  const databaseName = new URL(databaseUrl).pathname.slice(1);
  if (!/^dashboardmini_(fresh|restore)_/.test(databaseName)) {
    throw new Error(`Refusing to run integration tests against non-temporary database ${databaseName}.`);
  }
}
