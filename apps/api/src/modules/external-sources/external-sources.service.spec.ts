import { describe, expect, it, vi } from 'vitest';
import { ExternalSourcesService } from './external-sources.service.js';

const environment = { externalSourceSchemas: ['scopus'], databaseUrl: 'postgresql://unused', queryTimeoutMs: 1000, queryRowLimit: 1000 } as never;

describe('ExternalSourcesService policy', () => {
  const service = new ExternalSourcesService(environment);

  it.each(['public', 'pg_catalog', 'information_schema', 'unknown'])('blocks non-allowlisted schema %s', async schemaName => {
    await expect(service.tables(schemaName)).rejects.toMatchObject({ code: 'EXTERNAL_SCHEMA_FORBIDDEN' });
  });

  it('publishes an explicit read-only policy for every allowed source schema', async () => {
    await expect(service.sources()).resolves.toEqual({
      items: [expect.objectContaining({
        schemaName: 'scopus', readOnly: true,
        capabilities: { canRead: true, canInsert: false, canUpdate: false, canDelete: false, canExport: true },
      })],
    });
  });

  it.each(['sc_articles;DROP TABLE public.datasets', '"sc_articles"', 'sc-articles'])('rejects unsafe table identifier %s', async tableName => {
    await expect(service.columns('scopus', tableName)).rejects.toMatchObject({ code: 'INVALID_TABLE' });
  });

  it('returns constraints, foreign keys, and indexes from PostgreSQL metadata', async () => {
    const tableConnection = {
      query: vi.fn().mockResolvedValue({ rowCount: 1, rows: [{ relkind: 'r' }] }),
      end: vi.fn().mockResolvedValue(undefined),
    };
    const metadataConnection = {
      query: vi.fn()
        .mockResolvedValueOnce({ rows: [{ name: 'sc_articles_pkey', type: 'PRIMARY KEY', columns: ['id'], definition: 'PRIMARY KEY (id)' }] })
        .mockResolvedValueOnce({ rows: [{ name: 'sc_articles_author_id_fkey', columnName: 'author_id', referencedSchema: 'scopus', referencedTable: 'sc_authors', referencedColumn: 'id' }] })
        .mockResolvedValueOnce({ rows: [{ name: 'sc_articles_pkey', unique: true, primary: true, method: 'btree', definition: 'CREATE UNIQUE INDEX sc_articles_pkey ON scopus.sc_articles USING btree (id)' }] }),
      end: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(service as unknown as { pool: () => unknown }, 'pool')
      .mockReturnValueOnce(tableConnection)
      .mockReturnValueOnce(metadataConnection);

    await expect(service.metadata('scopus', 'sc_articles')).resolves.toEqual({
      schemaName: 'scopus',
      tableName: 'sc_articles',
      constraints: [expect.objectContaining({ name: 'sc_articles_pkey', columns: ['id'] })],
      foreignKeys: [expect.objectContaining({ referencedTable: 'sc_authors' })],
      indexes: [expect.objectContaining({ name: 'sc_articles_pkey', method: 'btree' })],
    });
    expect(metadataConnection.query).toHaveBeenCalledTimes(3);
    expect(tableConnection.end).toHaveBeenCalledOnce();
    expect(metadataConnection.end).toHaveBeenCalledOnce();
  });

  it('discovers both outgoing and incoming foreign-key paths for auto join', async () => {
    const tableConnection = {
      query: vi.fn().mockResolvedValue({ rowCount: 1, rows: [{ relkind: 'r' }] }),
      end: vi.fn().mockResolvedValue(undefined),
    };
    const relationshipConnection = {
      query: vi.fn().mockResolvedValue({ rows: [
        { name: 'article_journal_fk', columnName: 'journal_id', referencedSchema: 'scopus', referencedTable: 'sc_journals', referencedColumn: 'id', direction: 'outgoing' },
        { name: 'keyword_article_fk', columnName: 'id', referencedSchema: 'scopus', referencedTable: 'sc_keywords', referencedColumn: 'article_id', direction: 'incoming' },
      ] }),
      end: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(service as unknown as { pool: () => unknown }, 'pool')
      .mockReturnValueOnce(tableConnection)
      .mockReturnValueOnce(relationshipConnection);

    const result = await service.relationships('scopus', 'sc_articles');
    expect(result.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ direction: 'outgoing', referencedTable: 'sc_journals' }),
      expect.objectContaining({ direction: 'incoming', referencedTable: 'sc_keywords' }),
    ]));
    const relationshipSql = String(relationshipConnection.query.mock.calls[0][0]);
    expect(relationshipSql).toContain('UNION ALL');
    expect(relationshipSql).toContain('pg_constraint');
    expect(relationshipSql).not.toContain('information_schema.table_constraints');
  });

  it('executes a validated multi-table query and returns a read-only SQL preview', async () => {
    const connector = (service as unknown as { connector: { listColumns: typeof service.columns } }).connector;
    vi.spyOn(connector, 'listColumns').mockImplementation(async (_schema, table) => ({
      schemaName: 'scopus',
      tableName: table,
      readOnly: true,
      capabilities: { canRead: true, canInsert: false, canUpdate: false, canDelete: false, canExport: true },
      items: table === 'sc_articles'
        ? [
            { name: 'journal_id', dataType: 'bigint', nullable: true, ordinal: 1, primaryKey: false, foreignKeys: [] },
            { name: 'publication_year', dataType: 'integer', nullable: true, ordinal: 2, primaryKey: false, foreignKeys: [] },
          ]
        : [{ name: 'id', dataType: 'bigint', nullable: false, ordinal: 1, primaryKey: true, foreignKeys: [] }],
    }));
    const connection = {
      query: vi.fn().mockResolvedValue({ rows: [{ publication_year: 2025 }] }),
      end: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(service as unknown as { pool: () => unknown }, 'pool').mockReturnValue(connection);

    const result = await service.previewStructured({
      sourceSchema: 'scopus',
      baseTable: 'sc_articles',
      selectedTables: [
        { schema: 'scopus', table: 'sc_articles', alias: 'articles' },
        { schema: 'scopus', table: 'sc_journals', alias: 'journals' },
      ],
      selectedFields: [{ tableAlias: 'articles', column: 'publication_year', alias: 'publication_year' }],
      joins: [{
        left: { schema: 'scopus', table: 'sc_articles', alias: 'articles', column: 'journal_id' },
        right: { schema: 'scopus', table: 'sc_journals', alias: 'journals', column: 'id' },
        operator: 'eq',
        joinType: 'left',
      }],
      rowLimit: 100,
    });

    expect(result.rows).toEqual([{ publication_year: 2025 }]);
    expect(result.sqlPreview).toContain('LEFT JOIN');
    expect(result.sqlPreview).not.toContain('2025');
    expect(result.queryDurationMs).toEqual(expect.any(Number));
    expect(connection.query).toHaveBeenCalledWith(expect.objectContaining({
      text: expect.stringContaining('LEFT JOIN'),
      values: [100, 0],
    }));
  });

  it('rejects unsafe casts with sample values before executing the preview query', async () => {
    const connector = (service as unknown as { connector: { listColumns: typeof service.columns } }).connector;
    vi.spyOn(connector, 'listColumns').mockResolvedValue({
      schemaName: 'scopus', tableName: 'sc_articles', readOnly: true,
      capabilities: { canRead: true, canInsert: false, canUpdate: false, canDelete: false, canExport: true },
      items: [{ name: 'year_text', dataType: 'text', nullable: true, ordinal: 1, primaryKey: false, foreignKeys: [] }],
    });
    const connection = {
      query: vi.fn().mockResolvedValueOnce({ rows: [{ value: 'not-a-number' }] }),
      end: vi.fn().mockResolvedValue(undefined),
    };
    vi.spyOn(service as unknown as { pool: () => unknown }, 'pool').mockReturnValue(connection);

    await expect(service.previewStructured({
      sourceSchema: 'scopus',
      baseTable: 'sc_articles',
      selectedTables: [{ schema: 'scopus', table: 'sc_articles', alias: 'articles' }],
      selectedFields: [{ tableAlias: 'articles', column: 'year_text', cast: { targetType: 'numeric' } }],
    })).rejects.toMatchObject({
      code: 'UNSAFE_CAST_VALUES',
      message: expect.stringContaining('not-a-number'),
    });
    expect(connection.query).toHaveBeenCalledOnce();
  });
});
