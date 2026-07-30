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
});
