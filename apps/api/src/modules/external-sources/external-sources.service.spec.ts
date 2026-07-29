import { describe, expect, it } from 'vitest';
import { ExternalSourcesService } from './external-sources.service.js';

const environment = { externalSourceSchemas: ['scopus'], databaseUrl: 'postgresql://unused', queryTimeoutMs: 1000, queryRowLimit: 1000 } as never;

describe('ExternalSourcesService policy', () => {
  const service = new ExternalSourcesService(environment);

  it.each(['public', 'pg_catalog', 'information_schema', 'unknown'])('blocks non-allowlisted schema %s', async schemaName => {
    await expect(service.tables(schemaName)).rejects.toMatchObject({ code: 'EXTERNAL_SCHEMA_FORBIDDEN' });
  });

  it.each(['sc_articles;DROP TABLE public.datasets', '"sc_articles"', 'sc-articles'])('rejects unsafe table identifier %s', async tableName => {
    await expect(service.columns('scopus', tableName)).rejects.toMatchObject({ code: 'INVALID_TABLE' });
  });
});
