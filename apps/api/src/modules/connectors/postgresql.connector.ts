import { Pool, type PoolConfig } from 'pg';
import { ApiError } from '../../shared/http/api-error.js';
import {
  buildStructuredExternalQuery,
  type StructuredExternalQuery,
  type StructuredQueryMetadata,
} from '../external-sources/structured-query.js';
import { findShortestRelationshipPaths, type ForeignKeyEdge } from '../external-sources/relationship-graph.js';
import type { ConnectorCapabilities, DataSourceConnector } from './connector.js';

type PostgresqlConnectorOptions = {
  databaseUrl: string;
  allowedSchemas: string[];
  queryTimeoutMs: number;
  queryRowLimit: number;
  poolFactory?: (config: PoolConfig) => Pool;
};

const identifier = (value: string) => `"${value.replaceAll('"', '""')}"`;
const relationKinds = new Set(['r', 'p', 'v', 'm']);
const objectType = (kind: string) => ({ r: 'table', p: 'table', v: 'view', m: 'materialized_view' }[kind] || 'table');

export class PostgresqlConnector implements DataSourceConnector {
  readonly connectorType = 'postgresql';
  private readonly allowedSchemas: Set<string>;

  constructor(private readonly options: PostgresqlConnectorOptions) {
    this.allowedSchemas = new Set(options.allowedSchemas.map(value => value.toLowerCase()));
  }

  getCapabilities(): ConnectorCapabilities {
    return {
      connectorType: this.connectorType,
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
    };
  }

  async testConnection() {
    const startedAt = Date.now();
    const database = this.pool();
    try {
      await database.query('SELECT 1 AS ok');
      return { status: 'ready' as const, durationMs: Date.now() - startedAt };
    } finally {
      await database.end();
    }
  }

  async listSchemas() {
    return {
      items: [...this.allowedSchemas].map(schemaName => ({
        id: `postgresql-schema:${schemaName}`,
        displayName: schemaName,
        schemaName,
        connectorType: this.connectorType,
        sourceMode: 'live',
        readOnly: true,
        capabilities: { canRead: true, canInsert: false, canUpdate: false, canDelete: false, canExport: true },
        connectorCapabilities: this.getCapabilities(),
      })),
    };
  }

  async listObjects(schemaName: string) {
    const schema = this.schema(schemaName);
    const database = this.pool();
    try {
      const result = await database.query(`
        SELECT c.relname AS name,
          c.relname AS "tableName",
          c.reltuples::bigint AS "rowCountEstimate",
          c.relkind AS "relationKind",
          COALESCE(pk.columns, ARRAY[]::text[]) AS "primaryKey"
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        LEFT JOIN LATERAL (
          SELECT array_agg(a.attname ORDER BY array_position(i.indkey, a.attnum)) AS columns
          FROM pg_index i
          JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
          WHERE i.indrelid = c.oid AND i.indisprimary
        ) pk ON true
        WHERE n.nspname = $1 AND c.relkind = ANY($2::"char"[])
        ORDER BY c.relname
      `, [schema, [...relationKinds]]);
      return {
        schemaName: schema,
        items: result.rows.map(row => ({
          ...row,
          displayName: row.name,
          objectType: objectType(String(row.relationKind)),
          readOnly: true,
        })),
      };
    } finally {
      await database.end();
    }
  }

  async listColumns(schemaName: string, objectName: string) {
    const schema = this.schema(schemaName);
    const table = await this.table(schema, objectName);
    const database = this.pool();
    try {
      const [columns, foreignKeys] = await Promise.all([
        database.query(`
          SELECT c.column_name AS name,
            c.data_type AS "dataType",
            c.is_nullable = 'YES' AS nullable,
            c.ordinal_position AS ordinal,
            COALESCE(pk.is_pk, false) AS "primaryKey"
          FROM information_schema.columns c
          LEFT JOIN (
            SELECT a.attname AS column_name, true AS is_pk
            FROM pg_index i
            JOIN pg_class t ON t.oid = i.indrelid
            JOIN pg_namespace n ON n.oid = t.relnamespace
            JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(i.indkey)
            WHERE i.indisprimary AND n.nspname = $1 AND t.relname = $2
          ) pk ON pk.column_name = c.column_name
          WHERE c.table_schema = $1 AND c.table_name = $2
          ORDER BY c.ordinal_position
        `, [schema, table]),
        database.query(`
          SELECT source_column.attname AS "columnName",
            target_schema.nspname AS "referencedSchema",
            target_table.relname AS "referencedTable",
            target_column.attname AS "referencedColumn"
          FROM pg_constraint constraint_record
          JOIN pg_class source_table ON source_table.oid = constraint_record.conrelid
          JOIN pg_namespace source_schema ON source_schema.oid = source_table.relnamespace
          JOIN pg_class target_table ON target_table.oid = constraint_record.confrelid
          JOIN pg_namespace target_schema ON target_schema.oid = target_table.relnamespace
          JOIN LATERAL unnest(constraint_record.conkey, constraint_record.confkey)
            WITH ORDINALITY AS key_pair(source_attnum, target_attnum, ordinal_position) ON true
          JOIN pg_attribute source_column
            ON source_column.attrelid = source_table.oid AND source_column.attnum = key_pair.source_attnum
          JOIN pg_attribute target_column
            ON target_column.attrelid = target_table.oid AND target_column.attnum = key_pair.target_attnum
          WHERE constraint_record.contype = 'f'
            AND source_schema.nspname = $1
            AND source_table.relname = $2
          ORDER BY key_pair.ordinal_position
        `, [schema, table]),
      ]);
      const byColumn = new Map<string, unknown[]>();
      for (const relationship of foreignKeys.rows) {
        byColumn.set(relationship.columnName, [...(byColumn.get(relationship.columnName) || []), relationship]);
      }
      return {
        schemaName: schema,
        tableName: table,
        readOnly: true,
        capabilities: { canRead: true, canInsert: false, canUpdate: false, canDelete: false, canExport: true },
        items: columns.rows.map(column => ({ ...column, foreignKeys: byColumn.get(column.name) || [] })),
      };
    } finally {
      await database.end();
    }
  }

  async listRelationships(schemaName: string, objectName: string, targetTable?: string) {
    const schema = this.schema(schemaName);
    const table = await this.table(schema, objectName);
    const database = this.pool();
    try {
      const result = await database.query(`
        SELECT constraint_record.conname AS name,
          source_column.attname AS "columnName",
          target_schema.nspname AS "referencedSchema",
          target_table.relname AS "referencedTable",
          target_column.attname AS "referencedColumn",
          'outgoing' AS direction
        FROM pg_constraint constraint_record
        JOIN pg_class source_table ON source_table.oid = constraint_record.conrelid
        JOIN pg_namespace source_schema ON source_schema.oid = source_table.relnamespace
        JOIN pg_class target_table ON target_table.oid = constraint_record.confrelid
        JOIN pg_namespace target_schema ON target_schema.oid = target_table.relnamespace
        JOIN LATERAL unnest(constraint_record.conkey, constraint_record.confkey)
          WITH ORDINALITY AS key_pair(source_attnum, target_attnum, ordinal_position) ON true
        JOIN pg_attribute source_column
          ON source_column.attrelid = source_table.oid AND source_column.attnum = key_pair.source_attnum
        JOIN pg_attribute target_column
          ON target_column.attrelid = target_table.oid AND target_column.attnum = key_pair.target_attnum
        WHERE constraint_record.contype = 'f'
          AND source_schema.nspname = $1
          AND source_table.relname = $2
        UNION ALL
        SELECT constraint_record.conname AS name,
          target_column.attname AS "columnName",
          source_schema.nspname AS "referencedSchema",
          source_table.relname AS "referencedTable",
          source_column.attname AS "referencedColumn",
          'incoming' AS direction
        FROM pg_constraint constraint_record
        JOIN pg_class source_table ON source_table.oid = constraint_record.conrelid
        JOIN pg_namespace source_schema ON source_schema.oid = source_table.relnamespace
        JOIN pg_class target_table ON target_table.oid = constraint_record.confrelid
        JOIN pg_namespace target_schema ON target_schema.oid = target_table.relnamespace
        JOIN LATERAL unnest(constraint_record.conkey, constraint_record.confkey)
          WITH ORDINALITY AS key_pair(source_attnum, target_attnum, ordinal_position) ON true
        JOIN pg_attribute source_column
          ON source_column.attrelid = source_table.oid AND source_column.attnum = key_pair.source_attnum
        JOIN pg_attribute target_column
          ON target_column.attrelid = target_table.oid AND target_column.attnum = key_pair.target_attnum
        WHERE constraint_record.contype = 'f'
          AND target_schema.nspname = $1
          AND target_table.relname = $2
        ORDER BY name, "columnName"
      `, [schema, table]);
      if (!targetTable) return { schemaName: schema, tableName: table, items: result.rows };
      const target = await this.table(schema, targetTable);
      const graph = await database.query<ForeignKeyEdge>(`
        SELECT constraint_record.conname AS name,
          source_schema.nspname AS "sourceSchema",
          source_table.relname AS "sourceTable",
          source_column.attname AS "sourceColumn",
          target_schema.nspname AS "targetSchema",
          target_table.relname AS "targetTable",
          target_column.attname AS "targetColumn"
        FROM pg_constraint constraint_record
        JOIN pg_class source_table ON source_table.oid = constraint_record.conrelid
        JOIN pg_namespace source_schema ON source_schema.oid = source_table.relnamespace
        JOIN pg_class target_table ON target_table.oid = constraint_record.confrelid
        JOIN pg_namespace target_schema ON target_schema.oid = target_table.relnamespace
        JOIN LATERAL unnest(constraint_record.conkey, constraint_record.confkey)
          WITH ORDINALITY AS key_pair(source_attnum, target_attnum, ordinal_position) ON true
        JOIN pg_attribute source_column
          ON source_column.attrelid = source_table.oid AND source_column.attnum = key_pair.source_attnum
        JOIN pg_attribute target_column
          ON target_column.attrelid = target_table.oid AND target_column.attnum = key_pair.target_attnum
        WHERE constraint_record.contype = 'f'
          AND source_schema.nspname = $1
          AND target_schema.nspname = $1
        ORDER BY constraint_record.conname, key_pair.ordinal_position
      `, [schema]);
      return {
        schemaName: schema,
        tableName: table,
        items: result.rows,
        paths: findShortestRelationshipPaths(graph.rows, schema, table, target),
      };
    } finally {
      await database.end();
    }
  }

  async preview(input: Record<string, unknown>) {
    return this.executeStructuredQuery(input);
  }

  async executeStructuredQuery(input: Record<string, unknown>) {
    const structured = input as StructuredExternalQuery;
    const metadata: StructuredQueryMetadata = { allowedSchemas: this.allowedSchemas, tables: {} };
    for (const table of structured.selectedTables ?? []) {
      const schema = this.schema(table.schema);
      const columns = await this.listColumns(schema, table.table);
      metadata.tables[table.alias] = {
        schema,
        table: table.table,
        columns: Object.fromEntries(columns.items.map((column: {
          name: string;
          dataType: string;
          nullable: boolean;
          primaryKey: boolean;
        }) => [column.name, {
          dataType: column.dataType,
          nullable: column.nullable,
          primaryKey: column.primaryKey,
        }])),
      };
    }

    const pageSize = Math.max(1, Math.min(
      Number(structured.pageSize || structured.rowLimit || 100),
      this.options.queryRowLimit,
      10_000,
    ));
    const query = buildStructuredExternalQuery({ ...structured, pageSize }, metadata);
    const startedAt = Date.now();
    const database = this.pool();
    try {
      for (const field of structured.selectedFields ?? []) {
        if (!field.cast || field.cast.targetType === 'text') continue;
        const table = structured.selectedTables.find(item => item.alias === field.tableAlias);
        if (!table) continue;
        const source = `${identifier(field.column)}::text`;
        const validPattern = field.cast.targetType === 'numeric'
          ? `'^[+-]?(\\d+(\\.\\d+)?|\\.\\d+)$'`
          : `'^\\d{4}-\\d{2}-\\d{2}$'`;
        const invalid = await database.query(
          `SELECT ${source} AS value
           FROM ${identifier(table.schema)}.${identifier(table.table)}
           WHERE ${identifier(field.column)} IS NOT NULL
             AND NOT (${source} ~ ${validPattern})
           LIMIT 5`,
        );
        if (invalid.rows.length) {
          const samples = invalid.rows.map(row => String(row.value).slice(0, 80)).join(', ');
          throw new ApiError(
            400,
            'UNSAFE_CAST_VALUES',
            `Some values in ${field.tableAlias}.${field.column} cannot be converted to ${field.cast.targetType}: ${samples}`,
          );
        }
      }
      const result = await database.query({ text: query.text, values: query.values });
      return {
        rows: result.rows,
        page: query.page,
        pageSize: query.pageSize,
        truncated: result.rows.length === query.pageSize,
        queryDurationMs: Date.now() - startedAt,
        sqlPreview: query.text,
        readOnly: true,
      };
    } finally {
      await database.end();
    }
  }

  async estimateRowCount(schemaName: string, objectName: string) {
    const schema = this.schema(schemaName);
    const table = await this.table(schema, objectName);
    const database = this.pool();
    try {
      const result = await database.query<{ estimate: string }>(`
        SELECT greatest(c.reltuples::bigint, 0)::text AS estimate
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = $1 AND c.relname = $2
      `, [schema, table]);
      return Number(result.rows[0]?.estimate || 0);
    } finally {
      await database.end();
    }
  }

  private schema(name: string) {
    const schema = String(name || '').toLowerCase();
    if (!this.allowedSchemas.has(schema)) {
      throw new ApiError(403, 'EXTERNAL_SCHEMA_FORBIDDEN', 'This schema is not an allowed external source.');
    }
    return schema;
  }

  private async table(schema: string, name: string) {
    const table = String(name || '');
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) {
      throw new ApiError(400, 'INVALID_TABLE', 'Invalid table.');
    }
    const database = this.pool();
    try {
      const exists = await database.query(
        `SELECT c.relkind
         FROM pg_class c
         JOIN pg_namespace n ON n.oid = c.relnamespace
         WHERE n.nspname = $1
           AND c.relname = $2
           AND c.relkind = ANY($3::"char"[])`,
        [schema, table, [...relationKinds]],
      );
      if (!exists.rowCount) throw new ApiError(404, 'TABLE_NOT_FOUND', 'External table was not found.');
      return table;
    } finally {
      await database.end();
    }
  }

  private pool() {
    const config: PoolConfig = {
      connectionString: this.options.databaseUrl,
      max: 2,
      statement_timeout: this.options.queryTimeoutMs,
      query_timeout: this.options.queryTimeoutMs,
      application_name: 'dashboard-mini-bi-postgresql-connector',
      options: '-c default_transaction_read_only=on',
    };
    return this.options.poolFactory?.(config) ?? new Pool(config);
  }
}
