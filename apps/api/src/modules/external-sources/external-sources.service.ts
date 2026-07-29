import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import type { RuntimeEnvironment } from '../../app/config/environment.js';
import { ENVIRONMENT } from '../../app/config/token.js';
import { ApiError } from '../../shared/http/api-error.js';

type Input = Record<string, unknown>;
const identifier = (value: string) => `"${value.replaceAll('"', '""')}"`;
const allowedOperators = new Set(['eq', 'ne', 'gt', 'gte', 'lt', 'lte', 'contains', 'is_null', 'not_null']);

@Injectable()
export class ExternalSourcesService {
  private readonly allowedSchemas: Set<string>;
  constructor(@Inject(ENVIRONMENT) private readonly env: RuntimeEnvironment) {
    this.allowedSchemas = new Set((env.externalSourceSchemas || []).map(value => value.toLowerCase()));
  }
  private pool() { return new Pool({ connectionString: this.env.databaseUrl, max: 2, statement_timeout: this.env.queryTimeoutMs, query_timeout: this.env.queryTimeoutMs, application_name: 'dashboard-mini-bi-external-readonly' }); }
  private schema(name: string) { const schema = String(name || '').toLowerCase(); if (!this.allowedSchemas.has(schema)) throw new ApiError(403, 'EXTERNAL_SCHEMA_FORBIDDEN', 'This schema is not an allowed external source.'); return schema; }
  async sources() { return { items: [...this.allowedSchemas].map(name => ({ id: `postgres-schema:${name}`, displayName: name, schemaName: name, sourceMode: 'live' })) }; }
  async tables(schemaName: string) { const schema = this.schema(schemaName); const db = this.pool(); try { const result = await db.query(`SELECT c.relname AS name, c.reltuples::bigint AS "rowCountEstimate" FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname=$1 AND c.relkind IN ('r','p') ORDER BY c.relname`, [schema]); return { schemaName: schema, items: result.rows }; } finally { await db.end(); } }
  async columns(schemaName: string, tableName: string) { const schema = this.schema(schemaName); const table = await this.table(schema, tableName); const db = this.pool(); try { const result = await db.query(`SELECT c.column_name AS name,c.data_type AS "dataType",c.is_nullable='YES' AS nullable,c.ordinal_position AS ordinal,COALESCE(pk.is_pk,false) AS "primaryKey" FROM information_schema.columns c LEFT JOIN (SELECT a.attname AS column_name,true AS is_pk FROM pg_index i JOIN pg_class t ON t.oid=i.indrelid JOIN pg_namespace n ON n.oid=t.relnamespace JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=ANY(i.indkey) WHERE i.indisprimary AND n.nspname=$1 AND t.relname=$2) pk ON pk.column_name=c.column_name WHERE c.table_schema=$1 AND c.table_name=$2 ORDER BY c.ordinal_position`, [schema, table]); return { schemaName: schema, tableName: table, items: result.rows }; } finally { await db.end(); } }
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
    const pageSize = Math.max(1, Math.min(Number(input.pageSize || 100), Math.min(this.env.queryRowLimit, 5000))); const page = Math.max(1, Number(input.page || 1)); values.push(pageSize, (page - 1) * pageSize);
    const sql = `SELECT ${projection.join(', ')} FROM ${identifier(schema)}.${identifier(table)}${clauses.length ? ` WHERE ${clauses.join(' AND ')}` : ''}${groupBy.length ? ` GROUP BY ${groupBy.map(identifier).join(', ')}` : ''}${order} LIMIT $${values.length - 1} OFFSET $${values.length}`;
    const db = this.pool(); try { const result = await db.query({ text: sql, values }); return { rows: result.rows, page, pageSize, truncated: result.rows.length === pageSize }; } finally { await db.end(); }
  }
  private async table(schema: string, name: string) { const table = String(name || ''); if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(table)) throw new ApiError(400, 'INVALID_TABLE', 'Invalid table.'); const db=this.pool(); try { const exists=await db.query(`SELECT 1 FROM information_schema.tables WHERE table_schema=$1 AND table_name=$2 AND table_type='BASE TABLE'`,[schema,table]); if (!exists.rowCount) throw new ApiError(404,'TABLE_NOT_FOUND','External table was not found.'); return table; } finally { await db.end(); } }
  private field(allowed: Set<string>, field: string) { if (!allowed.has(field)) throw new ApiError(400, 'INVALID_COLUMN', 'External column is not allowed.'); }
}
