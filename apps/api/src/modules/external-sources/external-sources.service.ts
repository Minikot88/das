import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import type { RuntimeEnvironment } from '../../app/config/environment.js';
import { ENVIRONMENT } from '../../app/config/token.js';
import { ApiError } from '../../shared/http/api-error.js';

type Input = Record<string, unknown>;
const identifier = (value: string) => `"${value.replaceAll('"', '""')}"`;
const allowedOperators = new Set(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'is_null', 'not_null']);
const relationKinds = new Set(['r', 'p', 'v', 'm']);
const objectType = (kind: string) => ({ r: 'table', p: 'table', v: 'view', m: 'materialized_view' }[kind] || 'table');

@Injectable()
export class ExternalSourcesService {
  private readonly allowedSchemas: Set<string>;
  constructor(@Inject(ENVIRONMENT) private readonly env: RuntimeEnvironment) {
    this.allowedSchemas = new Set((env.externalSourceSchemas || []).map(value => value.toLowerCase()));
  }
  private pool() { return new Pool({ connectionString: this.env.databaseUrl, max: 2, statement_timeout: this.env.queryTimeoutMs, query_timeout: this.env.queryTimeoutMs, application_name: 'dashboard-mini-bi-external-readonly' }); }
  private schema(name: string) { const schema = String(name || '').toLowerCase(); if (!this.allowedSchemas.has(schema)) throw new ApiError(403, 'EXTERNAL_SCHEMA_FORBIDDEN', 'This schema is not an allowed external source.'); return schema; }
  async sources() {
    return { items: [...this.allowedSchemas].map(name => ({
      id: `postgres-schema:${name}`, displayName: name, schemaName: name, sourceMode: 'live', readOnly: true,
      capabilities: { canRead: true, canInsert: false, canUpdate: false, canDelete: false, canExport: true },
    })) };
  }
  async tables(schemaName: string) {
    const schema = this.schema(schemaName); const db = this.pool();
    try {
      const result = await db.query(`SELECT c.relname AS name, c.relname AS "tableName", c.reltuples::bigint AS "rowCountEstimate", c.relkind AS "relationKind",
        COALESCE(pk.columns, ARRAY[]::text[]) AS "primaryKey"
        FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
        LEFT JOIN LATERAL (SELECT array_agg(a.attname ORDER BY array_position(i.indkey, a.attnum)) AS columns FROM pg_index i JOIN pg_attribute a ON a.attrelid=i.indrelid AND a.attnum=ANY(i.indkey) WHERE i.indrelid=c.oid AND i.indisprimary) pk ON true
        WHERE n.nspname=$1 AND c.relkind = ANY($2::"char"[]) ORDER BY c.relname`, [schema, [...relationKinds]]);
      return { schemaName: schema, items: result.rows.map(row => ({
        ...row, displayName: row.name, objectType: objectType(String(row.relationKind)), readOnly: true,
        capabilities: { canRead: true, canInsert: false, canUpdate: false, canDelete: false, canExport: true },
      })) };
    } finally { await db.end(); }
  }
  async columns(schemaName: string, tableName: string) {
    const schema = this.schema(schemaName); const table = await this.table(schema, tableName); const db = this.pool();
    try {
      const [columns, foreignKeys] = await Promise.all([
        db.query(`SELECT c.column_name AS name,c.data_type AS "dataType",c.is_nullable='YES' AS nullable,c.ordinal_position AS ordinal,COALESCE(pk.is_pk,false) AS "primaryKey" FROM information_schema.columns c LEFT JOIN (SELECT a.attname AS column_name,true AS is_pk FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid JOIN pg_namespace n ON n.oid=t.relnamespace JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=ANY(i.indkey) WHERE i.indisprimary AND n.nspname=$1 AND t.relname=$2) pk ON pk.column_name=c.column_name WHERE c.table_schema=$1 AND c.table_name=$2 ORDER BY c.ordinal_position`, [schema, table]),
        db.query(`SELECT kcu.column_name AS "columnName",ccu.table_schema AS "referencedSchema",ccu.table_name AS "referencedTable",ccu.column_name AS "referencedColumn" FROM information_schema.table_constraints tc JOIN information_schema.key_column_usage kcu ON kcu.constraint_name=tc.constraint_name AND kcu.constraint_schema=tc.constraint_schema JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=tc.constraint_name AND ccu.constraint_schema=tc.constraint_schema WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema=$1 AND tc.table_name=$2 ORDER BY kcu.ordinal_position`, [schema, table]),
      ]);
      const byColumn = new Map<string, unknown[]>();
      for (const relation of foreignKeys.rows) byColumn.set(relation.columnName, [...(byColumn.get(relation.columnName) || []), relation]);
      return { schemaName: schema, tableName: table, readOnly: true, capabilities: { canRead: true, canInsert: false, canUpdate: false, canDelete: false, canExport: true }, items: columns.rows.map(column => ({ ...column, foreignKeys: byColumn.get(column.name) || [] })) };
    } finally { await db.end(); }
  }
  async relationships(schemaName: string, tableName: string) {
    const schema = this.schema(schemaName); const table = await this.table(schema, tableName); const db = this.pool();
    try {
      const result = await db.query(`SELECT tc.constraint_name AS name,kcu.column_name AS "columnName",ccu.table_schema AS "referencedSchema",ccu.table_name AS "referencedTable",ccu.column_name AS "referencedColumn"
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON kcu.constraint_name=tc.constraint_name AND kcu.constraint_schema=tc.constraint_schema
        JOIN information_schema.constraint_column_usage ccu ON ccu.constraint_name=tc.constraint_name AND ccu.constraint_schema=tc.constraint_schema
        WHERE tc.constraint_type='FOREIGN KEY' AND tc.table_schema=$1 AND tc.table_name=$2 ORDER BY tc.constraint_name,kcu.ordinal_position`, [schema, table]);
      return { schemaName: schema, tableName: table, items: result.rows };
    } finally { await db.end(); }
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
  async preview(input: Input) { return this.run(input); }
  async run(input: Input) {
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
