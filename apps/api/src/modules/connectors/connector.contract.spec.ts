import { describe, expect, it } from 'vitest';
import { ConnectorRegistry } from './connector.registry.js';
import { PostgresqlConnector } from './postgresql.connector.js';

describe('connector contract', () => {
  it('exposes one database-neutral capability contract for PostgreSQL', () => {
    const connector = new PostgresqlConnector({
      databaseUrl: 'postgresql://user:password@localhost:5432/dashboardmini',
      allowedSchemas: ['scopus'],
      queryTimeoutMs: 5_000,
      queryRowLimit: 1_000,
    });

    expect(connector.getCapabilities()).toEqual({
      connectorType: 'postgresql',
      implemented: true,
      readOnly: true,
      joins: ['inner', 'left'],
      supports: {
        testConnection: true,
        listSchemas: true,
        listObjects: true,
        listColumns: true,
        listRelationships: true,
        preview: true,
        executeStructuredQuery: true,
        estimateRowCount: true,
      },
    });
  });

  it('resolves PostgreSQL without presenting future connectors as usable', () => {
    const postgresql = new PostgresqlConnector({
      databaseUrl: 'postgresql://user:password@localhost:5432/dashboardmini',
      allowedSchemas: ['scopus'],
      queryTimeoutMs: 5_000,
      queryRowLimit: 1_000,
    });
    const registry = new ConnectorRegistry([postgresql]);

    expect(registry.get('postgresql')).toBe(postgresql);
    expect(() => registry.get('mysql')).toThrow(/not implemented/i);
  });
});
