import { describe, expect, it, vi } from 'vitest';
import { HTTP_CODE_METADATA } from '@nestjs/common/constants.js';
import { CoreDataController } from './core-data.controller.js';
import { CoreDataService } from './core-data.service.js';

function service() {
  const prisma = {
    biProjectMember: { findMany: vi.fn().mockResolvedValue([]) },
    biProject: { findFirst: vi.fn().mockResolvedValue({ id: 'project-1', organizationId: 'org-default', ownerUserId: 'user-development' }) },
    dataset: { findFirst: vi.fn().mockResolvedValue({ id: 'dataset-1', projectId: 'project-1', organizationId: 'org-default', status: 'ready' }) },
    datasetField: { findMany: vi.fn().mockResolvedValue([{ id: 'field-region', datasetId: 'dataset-1', fieldKey: 'region', name: 'region', dataType: 'string', nullable: false, ordinal: 0 }]) },
    datasetRow: { findMany: vi.fn().mockResolvedValue([{ rowNumber: 1, rowJson: { region: 'North' } }]) },
  };
  return new CoreDataService(prisma as never, { assertProjectPermission: vi.fn().mockResolvedValue(undefined), assertOrganizationAdmin: vi.fn().mockResolvedValue(undefined) } as never);
}

const principal = { organizationId: 'org-default', userId: 'user-development' };

describe('CoreDataService dataset query validation', () => {
  it('declares dataset queries as successful reads instead of resource creation', () => {
    expect(Reflect.getMetadata(HTTP_CODE_METADATA, CoreDataController.prototype.queryDataset)).toBe(200);
  });

  it('rejects unknown fields', async () => {
    await expect(service().queryDataset(principal, 'dataset-1', { select: ['secret_column'] })).rejects.toMatchObject({ code: 'UNKNOWN_FIELD' });
  });

  it('rejects unknown operators', async () => {
    await expect(service().queryDataset(principal, 'dataset-1', { filters: [{ field: 'region', operator: 'raw_sql', value: 'x' }] })).rejects.toMatchObject({ code: 'UNKNOWN_OPERATOR' });
  });

  it('returns paginated projected rows', async () => {
    await expect(service().queryDataset(principal, 'dataset-1', { select: ['region'], page: 1, pageSize: 10 })).resolves.toMatchObject({ rows: [{ region: 'North' }], total: 1, page: 1, pageSize: 10 });
  });

  it('keeps a live dataset bound to its saved schema and table', async () => {
    const prisma = {
      biProjectMember: { findMany: vi.fn().mockResolvedValue([]) },
      biProject: { findFirst: vi.fn().mockResolvedValue({ id: 'project-1', organizationId: 'org-default', ownerUserId: 'user-development' }) },
      dataset: { findFirst: vi.fn().mockResolvedValue({ id: 'dataset-live', projectId: 'project-1', organizationId: 'org-default', sourceType: 'postgres_schema', sourceConfigJson: { schemaName: 'scopus', tableName: 'sc_articles', select: ['title'] } }) },
      auditLog: { create: vi.fn().mockResolvedValue({}) },
    };
    const external = { run: vi.fn().mockResolvedValue({ rows: [{ title: 'Article' }], page: 1, pageSize: 10, truncated: false }) };
    const instance = new CoreDataService(prisma as never, { assertProjectPermission: vi.fn().mockResolvedValue(undefined) } as never, external as never);
    await instance.queryDataset(principal, 'dataset-live', { schemaName: 'public', tableName: 'users', pageSize: 10 });
    expect(external.run).toHaveBeenCalledWith(expect.objectContaining({ schemaName: 'scopus', tableName: 'sc_articles' }));
  });

  it('returns an existing live dataset instead of duplicating its schema table definition', async () => {
    const existing = { id: 'dataset-existing', sourceConfigJson: { schemaName: 'scopus', tableName: 'sc_articles' } };
    const prisma = {
      biProjectMember: { findMany: vi.fn().mockResolvedValue([]) },
      biProject: { findFirst: vi.fn().mockResolvedValue({ id: 'project-1', organizationId: 'org-default', ownerUserId: 'user-development' }) },
      dataset: { findMany: vi.fn().mockResolvedValue([existing]) },
    };
    const external = { columns: vi.fn(), tables: vi.fn() };
    const instance = new CoreDataService(prisma as never, { assertProjectPermission: vi.fn().mockResolvedValue(undefined) } as never, external as never);
    await expect(instance.createExternalDataset(principal, { projectId: 'project-1', schemaName: 'scopus', tableName: 'sc_articles' })).resolves.toBe(existing);
    expect(external.columns).not.toHaveBeenCalled();
  });

  it('persists a validated multi-table dataset definition and qualified fields', async () => {
    const datasetCreate = vi.fn(async ({ data }) => data);
    const fieldCreateMany = vi.fn().mockResolvedValue({ count: 2 });
    const versionCreate = vi.fn().mockResolvedValue({});
    const tx = {
      dataset: { create: datasetCreate },
      datasetField: { createMany: fieldCreateMany },
      datasetVersion: { create: versionCreate },
    };
    const prisma = {
      biProjectMember: { findMany: vi.fn().mockResolvedValue([]) },
      biProject: { findFirst: vi.fn().mockResolvedValue({ id: 'project-1', organizationId: 'org-default', ownerUserId: 'user-development' }) },
      dataset: { findMany: vi.fn().mockResolvedValue([]) },
      $transaction: vi.fn(async callback => callback(tx)),
    };
    const external = {
      columns: vi.fn(async (_schema, table) => ({
        items: table === 'sc_articles'
          ? [{ name: 'publication_year', dataType: 'integer', nullable: true, ordinal: 1, primaryKey: false }]
          : [{ name: 'name', dataType: 'character varying', nullable: true, ordinal: 1, primaryKey: false }],
      })),
      tables: vi.fn().mockResolvedValue({ items: [{ name: 'sc_articles', rowCountEstimate: 6004 }] }),
      previewStructured: vi.fn().mockResolvedValue({ rows: [], sqlPreview: 'SELECT ...', queryDurationMs: 2 }),
    };
    const instance = new CoreDataService(prisma as never, { assertProjectPermission: vi.fn().mockResolvedValue(undefined) } as never, external as never);
    const definition = {
      projectId: 'project-1',
      name: 'Articles with journals',
      sourceSchema: 'scopus',
      baseTable: 'sc_articles',
      selectedTables: [
        { schema: 'scopus', table: 'sc_articles', alias: 'articles' },
        { schema: 'scopus', table: 'sc_journals', alias: 'journals' },
      ],
      selectedFields: [
        { tableAlias: 'articles', column: 'publication_year', alias: 'publication_year' },
        { tableAlias: 'journals', column: 'name', alias: 'journal_name' },
      ],
      joins: [{
        left: { schema: 'scopus', table: 'sc_articles', alias: 'articles', column: 'journal_id' },
        right: { schema: 'scopus', table: 'sc_journals', alias: 'journals', column: 'id' },
        joinType: 'left',
        operator: 'eq',
      }],
      aggregations: [
        { field: { tableAlias: 'articles', column: 'publication_year' }, operation: 'count', alias: 'article_count' },
      ],
      semanticTypeOverrides: { 'articles.publication_year': 'Year' },
      rowLimit: 500,
    };

    await instance.createExternalDataset(principal, definition);

    expect(external.previewStructured).toHaveBeenCalledWith(expect.objectContaining({ selectedTables: definition.selectedTables }));
    expect(datasetCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        sourceConfigJson: expect.objectContaining({
          baseTable: 'sc_articles',
          selectedTables: definition.selectedTables,
          joins: definition.joins,
          semanticTypeOverrides: definition.semanticTypeOverrides,
        }),
      }),
    }));
    expect(fieldCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
      expect.objectContaining({ fieldKey: 'publication_year', label: 'articles.publication_year', semanticType: 'Year' }),
      expect.objectContaining({ fieldKey: 'journal_name', label: 'journals.name' }),
      expect.objectContaining({ fieldKey: 'article_count', label: 'Count(articles.publication_year)', semanticType: 'Number' }),
      ]),
    });
  });

  it('refreshes connector metadata cache from live PostgreSQL catalogs', async () => {
    const schemaCreate = vi.fn().mockResolvedValue({ id: 'schema-cache' });
    const tableCreate = vi.fn().mockResolvedValue({ id: 'table-cache' });
    const columnCreateMany = vi.fn().mockResolvedValue({ count: 2 });
    const relationshipCreateMany = vi.fn().mockResolvedValue({ count: 1 });
    const tx = {
      dataSourceRelationship: { deleteMany: vi.fn(), createMany: relationshipCreateMany },
      dataSourceTable: { deleteMany: vi.fn(), create: tableCreate },
      dataSourceSchema: { deleteMany: vi.fn(), create: schemaCreate },
      dataSourceColumn: { createMany: columnCreateMany },
      dataSourceConnection: { update: vi.fn() },
    };
    const prisma = {
      biProjectMember: { findMany: vi.fn().mockResolvedValue([]) },
      biProject: { findFirst: vi.fn().mockResolvedValue({ id: 'project-1', organizationId: 'org-default', ownerUserId: 'user-development' }) },
      dataSourceConnection: {
        findFirst: vi.fn().mockResolvedValue({
          id: 'source-scopus',
          data_source_schemas: [{ name: 'scopus', readOnly: true }],
        }),
      },
      $transaction: vi.fn(async callback => callback(tx)),
    };
    const external = {
      tables: vi.fn().mockResolvedValue({
        items: [{ name: 'sc_articles', objectType: 'table', rowCountEstimate: 6004 }],
      }),
      columns: vi.fn().mockResolvedValue({
        items: [
          { name: 'id', dataType: 'bigint', nullable: false, ordinal: 1, primaryKey: true, foreignKeys: [] },
          { name: 'journal_id', dataType: 'bigint', nullable: true, ordinal: 2, primaryKey: false, foreignKeys: [{}] },
        ],
      }),
      relationships: vi.fn().mockResolvedValue({
        items: [{
          name: 'sc_articles_journal_id_fkey',
          columnName: 'journal_id',
          referencedSchema: 'scopus',
          referencedTable: 'sc_journals',
          referencedColumn: 'id',
          direction: 'outgoing',
        }],
      }),
    };
    const instance = new CoreDataService(
      prisma as never,
      { assertProjectPermission: vi.fn().mockResolvedValue(undefined) } as never,
      external as never,
    );

    await expect(instance.refreshExternalSource(principal, 'project-1', 'source-scopus')).resolves.toEqual({
      sourceId: 'source-scopus',
      schemas: 1,
      objects: 1,
      fields: 2,
      relationships: 1,
    });
    expect(columnCreateMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ name: 'id', primaryKey: true, foreignKey: false }),
        expect.objectContaining({ name: 'journal_id', primaryKey: false, foreignKey: true }),
      ]),
    });
    expect(relationshipCreateMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({
        leftTable: 'sc_articles',
        leftColumn: 'journal_id',
        rightTable: 'sc_journals',
        rightColumn: 'id',
      })],
    });
  });

  it('rejects a viewer attempting to create a dashboard', async () => {
    const prisma = {} as never;
    const authorization = { assertProjectPermission: vi.fn().mockRejectedValue({ status: 403, code: 'FORBIDDEN' }) };
    const service = new CoreDataService(prisma, authorization as never);
    await expect(service.createDashboard(principal, { projectId: 'project-1', name: 'Blocked' })).rejects.toMatchObject({ code: 'FORBIDDEN' });
    expect(authorization.assertProjectPermission).toHaveBeenCalledWith(expect.anything(), 'project-1', 'write');
  });

  it('rejects a stale dataset archive before changing data', async () => {
    const prisma = {
      biProjectMember: { findMany: vi.fn().mockResolvedValue([]) },
      biProject: { findFirst: vi.fn().mockResolvedValue({ id: 'project-1', organizationId: 'org-default', ownerUserId: 'user-development' }) },
      dataset: { findFirst: vi.fn().mockResolvedValue({ id: 'dataset-1', projectId: 'project-1', organizationId: 'org-default', revision: 3 }) },
    };
    const instance = new CoreDataService(prisma as never, { assertProjectPermission: vi.fn().mockResolvedValue(undefined) } as never);
    await expect(instance.archiveDataset(principal, 'dataset-1', 2)).rejects.toMatchObject({ code: 'REVISION_CONFLICT', currentRevision: 3 });
  });

  it('updates only a catalog name with a current revision', async () => {
    const update = vi.fn().mockResolvedValue({ id: 'dataset-1', name: 'Scopus affiliations', revision: 4 });
    const prisma = {
      biProjectMember: { findMany: vi.fn().mockResolvedValue([]) },
      biProject: { findFirst: vi.fn().mockResolvedValue({ id: 'project-1', organizationId: 'org-default', ownerUserId: 'user-development' }) },
      dataset: { findFirst: vi.fn().mockResolvedValue({ id: 'dataset-1', projectId: 'project-1', organizationId: 'org-default', revision: 3, sourceType: 'postgres_schema' }), update },
    };
    const instance = new CoreDataService(prisma as never, { assertProjectPermission: vi.fn().mockResolvedValue(undefined) } as never);
    await expect(instance.updateDataset(principal, 'dataset-1', { name: 'Scopus affiliations', revision: 3 })).resolves.toMatchObject({ revision: 4 });
    expect(update).toHaveBeenCalledWith(expect.objectContaining({ data: { name: 'Scopus affiliations', revision: { increment: 1 } } }));
  });

  it('rejects stale catalog edits before changing metadata', async () => {
    const update = vi.fn();
    const prisma = {
      biProjectMember: { findMany: vi.fn().mockResolvedValue([]) },
      biProject: { findFirst: vi.fn().mockResolvedValue({ id: 'project-1', organizationId: 'org-default', ownerUserId: 'user-development' }) },
      dataset: { findFirst: vi.fn().mockResolvedValue({ id: 'dataset-1', projectId: 'project-1', organizationId: 'org-default', revision: 3 }), update },
    };
    const instance = new CoreDataService(prisma as never, { assertProjectPermission: vi.fn().mockResolvedValue(undefined) } as never);
    await expect(instance.updateDataset(principal, 'dataset-1', { name: 'Stale', revision: 2 })).rejects.toMatchObject({ code: 'REVISION_CONFLICT' });
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects a stale dashboard archive before changing data', async () => {
    const prisma = {
      biProjectMember: { findMany: vi.fn().mockResolvedValue([]) },
      biProject: { findFirst: vi.fn().mockResolvedValue({ id: 'project-1', organizationId: 'org-default', ownerUserId: 'user-development' }) },
      biDashboard: { findFirst: vi.fn().mockResolvedValue({ id: 'dashboard-1', projectId: 'project-1', organizationId: 'org-default', revision: 5 }) },
      dashboardWidget: { findMany: vi.fn().mockResolvedValue([]) },
    };
    const instance = new CoreDataService(prisma as never, { assertProjectPermission: vi.fn().mockResolvedValue(undefined) } as never);
    await expect(instance.archiveDashboard(principal, 'dashboard-1', 4)).rejects.toMatchObject({ code: 'REVISION_CONFLICT', currentRevision: 5 });
  });
});
