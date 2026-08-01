import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import type { RuntimeEnvironment } from '../../app/config/environment.js';
import { ENVIRONMENT } from '../../app/config/token.js';
import { ApiError } from '../../shared/http/api-error.js';
import { PostgresqlConnector } from '../connectors/postgresql.connector.js';
import { type StructuredExternalQuery } from './structured-query.js';

type Input = Record<string, unknown>;
const identifier = (value: string) => `"${value.replaceAll('"', '""')}"`;
const allowedOperators = new Set(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'is_null', 'not_null']);
const relationKinds = new Set(['r', 'p', 'v', 'm']);
const objectType = (kind: string) => ({ r: 'table', p: 'table', v: 'view', m: 'materialized_view' }[kind] || 'table');

@Injectable()
export class ExternalSourcesService {
  private readonly allowedSchemas: Set<string>;
  private readonly connector: PostgresqlConnector;
  constructor(@Inject(ENVIRONMENT) private readonly env: RuntimeEnvironment) {
    this.allowedSchemas = new Set((env.externalSourceSchemas || []).map(value => value.toLowerCase()));
    this.connector = new PostgresqlConnector({
      databaseUrl: env.databaseUrl || '',
      allowedSchemas: [...this.allowedSchemas],
      queryTimeoutMs: env.queryTimeoutMs,
      queryRowLimit: env.queryRowLimit,
      poolFactory: () => this.pool(),
    });
  }
  private pool() { return new Pool({ connectionString: this.env.databaseUrl, max: 2, statement_timeout: this.env.queryTimeoutMs, query_timeout: this.env.queryTimeoutMs, application_name: 'dashboard-mini-bi-external-readonly', options: '-c default_transaction_read_only=on' }); }
  private schema(name: string) { const schema = String(name || '').toLowerCase(); if (!this.allowedSchemas.has(schema)) throw new ApiError(403, 'EXTERNAL_SCHEMA_FORBIDDEN', 'This schema is not an allowed external source.'); return schema; }
  async sources() {
    return this.connector.listSchemas();
  }
  async tables(schemaName: string) {
    return this.connector.listObjects(schemaName);
  }
  async columns(schemaName: string, tableName: string) {
    return this.connector.listColumns(schemaName, tableName);
  }
  async relationships(schemaName: string, tableName: string) {
    return this.connector.listRelationships(schemaName, tableName);
  }
  async metadata(schemaName: string, tableName: string) {
    const schema = this.schema(schemaName); const table = await this.table(schema, tableName); const db = this.pool();
    try {
      const [constraints, foreignKeys, indexes] = await Promise.all([
        db.query(`SELECT con.conname AS name,
          CASE con.contype WHEN 'p' THEN 'PRIMARY KEY' WHEN 'u' THEN 'UNIQUE' WHEN 'c' THEN 'CHECK' WHEN 'f' THEN 'FOREIGN KEY' ELSE con.contype::text END AS type,
          COALESCE(array_agg(att.attname ORDER BY keys.ordinality) FILTER (WHERE att.attname IS NOT NULL), ARRAY[]::text[]) AS columns,
          pg_get_constraintdef(con.oid, true) AS definition
          FROM pg_constraint con
          JOIN pg_class rel ON rel.oid=con.conrelid
          JOIN pg_namespace nsp ON nsp.oid=rel.relnamespace
          LEFT JOIN LATERAL unnest(con.conkey) WITH ORDINALITY AS keys(attnum, ordinality) ON true
          LEFT JOIN pg_attribute att ON att.attrelid=rel.oid AND att.attnum=keys.attnum
          WHERE nsp.nspname=$1 AND rel.relname=$2
          GROUP BY con.oid,con.conname,con.contype
          ORDER BY con.conname`, [schema, table]),
        db.query(`SELECT tc.constraint_name AS name,kcu.column_name AS "columnName",ccu.table_schema AS "referencedSchema",ccu.table_name AS "referencedTable",ccu.column_name AS "referencedColumn"
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu ON kcu.constraint_name=tc.constraint_name AND kcu.constraint_schema=tc.constraint_schema
          JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=tc.constraint_name AND ccu.constraint_schema=tc.constraint_schema
          WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema=$1 AND tc.table_name=$2
          ORDER BY tc.constraint_name,kcu.ordinal_position`, [schema, table]),
        db.query(`SELECT idx.relname AS name, ix.indisunique AS unique, ix.indisprimary AS primary,
          am.amname AS method, pg_get_indexdef(ix.indexrelid) AS definition
          FROM pg_index ix
          JOIN pg_class rel ON rel.oid=ix.indrelid
          JOIN pg_namespace nsp ON nsp.oid=rel.relnamespace
          JOIN pg_class idx ON idx.oid=ix.indexrelid
          JOIN pg_am am ON am.oid=idx.relam
          WHERE nsp.nspname=$1 AND rel.relname=$2
          ORDER BY idx.relname`, [schema, table]),
      ]);
      return {
        schemaName: schema,
        tableName: table,
        constraints: constraints.rows,
        foreignKeys: foreignKeys.rows,
        indexes: indexes.rows,
      };
    } finally { await db.end(); }
  }
  async preview(input: Input) {
    return Array.isArray(input.selectedTables)
      ? this.previewStructured(input as StructuredExternalQuery)
      : this.run(input);
  }
  async previewStructured(input: StructuredExternalQuery) {
    return this.connector.executeStructuredQuery(input as unknown as Record<string, unknown>);
  }
  async run(input: Input): Promise<{ rows: Input[]; page: number; pageSize: number; truncated: boolean; queryDurationMs?: number; sqlPreview?: string; readOnly?: boolean }> {
    if (Array.isArray(input.selectedTables)) return this.previewStructured(input as StructuredExternalQuery);
    const schema = this.schema(String(input.schemaName || '')); const table = await this.table(schema, String(input.tableName || ''));
    const columns = await this.columns(schema, table); const allowed = new Set(columns.items.map((x: { name: string }) => x.name));
    const select = (Array.isArray(input.select) && input.select.length ? input.select : [...allowed]).map(String); select.forEach(field => this.field(allowed, field));
    const values: unknown[] = []; const filters = Array.isArray(input.filters) ? input.filters as Input[] : [];
    const clauses = filters.map(filter => { const field = String(filter.field || ''); const op = String(filter.operator || ''); this.field(allowed, field); if (!allowedOperators.has(op)) throw new ApiError(400, 'INVALID_FILTER', 'Unsupported filter operator.'); const col = identifier(field); if (op === 'is_null') return `${col} IS NULL`; if (op === 'not_null') return `${col} IS NOT NULL`; values.push(op === 'contains' ? `%${String(filter.value ?? '')}%` : filter.value); const parameter = `$${values.length}`; return op === 'contains' ? `${col}::text ILIKE ${parameter}` : `${col} ${({ eq: '=', ne: '<>', gt: '>', gte: '>=', lt: '<', lte: '<=' } as Record<string,string>)[op]} ${parameter}`; });
    const groupBy = Array.isArray(input.groupBy) ? input.groupBy.map(String) : []; groupBy.forEach(field => this.field(allowed, field));
    const aggregate = Array.isArray(input.aggregates) ? input.aggregates as Input[] : [];
    const aggregateSql = aggregate.map(item => { const field = String(item.field || ''); const operation = String(item.operation || '').toLowerCase(); this.field(allowed, field); if (!['count','sum','avg','min','max'].includes(operation)) throw new ApiError(400, 'INVALID_AGGREGATE', 'Unsupported aggregation.'); const alias = String(item.alias || `${operation}_${field}`); return `${operation === 'count' ? 'COUNT' : operation.toUpperCase()}(${operation === 'count' ? '*' : identifier(field)}) AS ${identifier(alias)}`; });
    const projection = aggregateSql.length || groupBy.length ? [...groupBy.map(identifier), ...aggregateSql] : select.map(identifier);
    const sort = input.sort as Input | undefined; let order = ''; if (sort?.field) { const field = String(sort.field); this.field(new Set([...allowed, ...aggregate.map(x => String(x.alias || `${x.operation}_${x.field}`))]), field); order = ` ORDER BY ${identifier(field)} ${String(sort.direction).toLowerCase() === 'desc' ? 'DESC' : 'ASC'}`; }
    else if (!aggregateSql.length) { const primaryKeys = columns.items.filter((column: { primaryKey: boolean }) => column.primaryKey).map((column: { name: string }) => identifier(column.name)); if (primaryKeys.length) order = ` ORDER BY ${primaryKeys.join(', ')}`; }
    const pageSize = Math.max(1, Math.min(Number(input.pageSize || 100), Math.min(this.env.queryRowLimit, 10_000))); const page = Math.max(1, Number(input.page || 1)); values.push(pageSize, (page - 1) * pageSize);
    const sql = `SELECT ${projection.join(', ')} FROM ${identifier(schema)}.${identifier(table)}${clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''}${groupBy.length ? ` GROUP BY ${groupBy.map(identifier).join(', ')}` : ''}${order} LIMIT $${values.length - 1} OFFSET $${values.length}`;
    const db = this.pool(); try { const result = await db.query({ text: sql, values }); return { rows: result.rows, page, pageSize, truncated: result.rows.length === pageSize }; } finally { await db.end(); }
  }
  private async table(schema: string, name: string) { const table = String(name || ''); if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) throw new ApiError(400, 'INVALID_TABLE', 'Invalid table.'); const db=this.pool(); try { const exists=await db.query(`SELECT c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relname=$2 AND c.relkind = ANY($3::"char"[])`,[schema,table,[...relationKinds]]); if (!exists.rowCount) throw new ApiError(404,'TABLE_NOT_FOUND','External table was not found.'); return table; } finally { await db.end(); } }
  private field(allowed: Set<string>, field: string) { if (!allowed.has(field)) throw new ApiError(400, 'INVALID_COLUMN', 'External column is not allowed.'); }
}
